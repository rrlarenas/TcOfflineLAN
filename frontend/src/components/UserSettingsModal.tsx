import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { useLanguage } from '../contexts/LanguageContext';
import type { User, SystemConfig, PredefinedText } from '../types';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdated: (user: User) => void;
}

interface FiltrosState {
  user: string;
  Tipo: string;
  Hospital: string;
  Local: string;
  Profesional: string;
}

function parseFiltros(raw: string | null | undefined): FiltrosState {
  const defaults: FiltrosState = { user: '', Tipo: '', Hospital: '', Local: '', Profesional: '' };
  if (!raw) return defaults;
  const parts = raw.split('&');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim() as keyof FiltrosState;
    const v = part.slice(idx + 1).trim();
    if (k in defaults) defaults[k] = v;
  }
  return defaults;
}

function serializeFiltros(f: FiltrosState): string {
  const parts: string[] = [];
  if (f.user.trim()) parts.push(`user=${f.user.trim()}`);
  if (f.Tipo.trim()) parts.push(`Tipo=${f.Tipo.trim()}`);
  if (f.Hospital.trim()) parts.push(`Hospital=${f.Hospital.trim()}`);
  if (f.Local.trim()) parts.push(`Local=${f.Local.trim()}`);
  if (f.Profesional.trim()) parts.push(`Profesional=${f.Profesional.trim()}`);
  return parts.join('&');
}

const DEFAULT_CONFIG: SystemConfig = {
  central_url: '',
  central_api_endpoint: '',
  central_hl7_endpoint: '',
  central_users_endpoint: '',
  central_api_username: '',
  central_api_password: '',
  health_check_interval: 8,
  downstream_sync_interval: 60,
  upstream_sync_interval: 10,
  max_retries: 5,
};

export function UserSettingsModal({ isOpen, onClose, user, onUserUpdated }: UserSettingsModalProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'settings' | 'filters' | 'predefined' | 'users' | 'system'>('settings');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState(user.nombre || '');
  const [filtros, setFiltros] = useState<FiltrosState>(parseFiltros(user.filtros));
  const [enableReadOnlyMode, setEnableReadOnlyMode] = useState(true);
  const [enableNewEpisodeButton, setEnableNewEpisodeButton] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Predefined texts state
  const [predefinedTexts, setPredefinedTexts] = useState<PredefinedText[]>([]);
  const [isLoadingPT, setIsLoadingPT] = useState(false);
  const [newPTTitle, setNewPTTitle] = useState('');
  const [newPTContent, setNewPTContent] = useState('');
  const [isSavingPT, setIsSavingPT] = useState(false);
  const [editingPT, setEditingPT] = useState<PredefinedText | null>(null);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const [systemConfig, setSystemConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [originalSystemConfig, setOriginalSystemConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('settings');
      setFiltros(parseFiltros(user.filtros));
      api.getSystemSettings().then(settings => {
        setEnableReadOnlyMode(settings.enable_read_only_mode);
        setEnableNewEpisodeButton(settings.enable_new_episode_button);
      }).catch(err => {
        console.error('Error loading system settings:', err);
      });

      if (user.is_admin) {
        loadUsers();
        loadSystemConfig();
      }
    }
  }, [isOpen, user.is_admin]);

  useEffect(() => {
    if (isOpen && activeTab === 'predefined') {
      loadPredefinedTexts();
    }
  }, [isOpen, activeTab]);

  const loadPredefinedTexts = async () => {
    setIsLoadingPT(true);
    try {
      const list = await api.listPredefinedTexts();
      setPredefinedTexts(list);
    } catch (err) {
      console.error('Error loading predefined texts:', err);
    } finally {
      setIsLoadingPT(false);
    }
  };

  const handleAddPT = async () => {
    if (!newPTTitle.trim() || !newPTContent.trim()) return;
    setIsSavingPT(true);
    try {
      const created = await api.createPredefinedText({ title: newPTTitle.trim(), content: newPTContent.trim() });
      setPredefinedTexts(prev => [...prev, created]);
      setNewPTTitle('');
      setNewPTContent('');
    } catch (err: any) {
      setError(err.message || t.userSettings.saveError);
    } finally {
      setIsSavingPT(false);
    }
  };

  const handleTogglePT = async (pt: PredefinedText) => {
    try {
      const updated = await api.updatePredefinedText(pt.id, { active: !pt.active });
      setPredefinedTexts(prev => prev.map(p => p.id === pt.id ? updated : p));
    } catch (err: any) {
      setError(err.message || t.userSettings.saveError);
    }
  };

  const handleSaveEditPT = async () => {
    if (!editingPT) return;
    setIsSavingPT(true);
    try {
      const updated = await api.updatePredefinedText(editingPT.id, {
        title: editingPT.title,
        content: editingPT.content,
      });
      setPredefinedTexts(prev => prev.map(p => p.id === editingPT.id ? updated : p));
      setEditingPT(null);
    } catch (err: any) {
      setError(err.message || t.userSettings.saveError);
    } finally {
      setIsSavingPT(false);
    }
  };

  const handleDeletePT = async (pt: PredefinedText) => {
    if (!window.confirm(t.userSettings.deleteConfirm)) return;
    try {
      await api.deletePredefinedText(pt.id);
      setPredefinedTexts(prev => prev.filter(p => p.id !== pt.id));
    } catch (err: any) {
      setError(err.message || t.userSettings.saveError);
    }
  };

  const loadSystemConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const cfg = await api.getSystemConfig();
      setSystemConfig(cfg);
      setOriginalSystemConfig(cfg);
    } catch (err) {
      console.error('Error loading system config:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleSaveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const updated = await api.updateSystemConfig(systemConfig);
      setSystemConfig(updated);
      setOriginalSystemConfig(updated);
      setSuccess('Configuración del sistema actualizada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersList = await api.listUsers();
      setUsers(usersList);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newUsername || !newPassword) {
      setError('Usuario y contraseña son requeridos');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.createUser({
        username: newUsername,
        password: newPassword,
        nombre: newNombre || undefined,
        is_admin: newIsAdmin,
      });

      setSuccess('Usuario creado correctamente');
      setNewUsername('');
      setNewPassword('');
      setNewNombre('');
      setNewIsAdmin(false);
      setShowCreateUser(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsSubmitting(true);

    try {
      const newFiltrosStr = serializeFiltros(filtros);
      const updateData: { password?: string; nombre?: string; filtros?: string } = {};
      let hasUserChanges = false;
      let hasSystemChanges = false;

      if (password) {
        updateData.password = password;
        hasUserChanges = true;
      }

      if (nombre !== user.nombre) {
        updateData.nombre = nombre;
        hasUserChanges = true;
      }

      if (newFiltrosStr !== (user.filtros || '')) {
        updateData.filtros = newFiltrosStr;
        hasUserChanges = true;
      }

      if (user.is_admin) {
        const currentSettings = await api.getSystemSettings();
        if (
          enableReadOnlyMode !== currentSettings.enable_read_only_mode ||
          enableNewEpisodeButton !== currentSettings.enable_new_episode_button
        ) {
          hasSystemChanges = true;
        }
      }

      if (!hasUserChanges && !hasSystemChanges) {
        setError('No hay cambios para guardar');
        setIsSubmitting(false);
        return;
      }

      if (hasUserChanges) {
        const updatedUser = await api.updateCurrentUser(updateData);
        auth.updateUser(updatedUser);
        onUserUpdated(updatedUser);
      }

      if (hasSystemChanges) {
        await api.updateSystemSettings({
          enable_read_only_mode: enableReadOnlyMode,
          enable_new_episode_button: enableNewEpisodeButton,
        });
      }

      setSuccess('Configuración actualizada correctamente');
      setPassword('');
      setConfirmPassword('');

      if (updateData.filtros !== undefined) {
        try {
          await api.syncFromCentral();
          window.dispatchEvent(new CustomEvent('sync-completed'));
        } catch (syncErr) {
          console.error('Error triggering sync after filter update:', syncErr);
        }
      }

      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la configuración');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setNombre(user.nombre || '');
    setFiltros(parseFiltros(user.filtros));
    setError('');
    setSuccess('');
    onClose();
  };

  const tabs: Array<{ id: 'settings' | 'filters' | 'predefined' | 'users' | 'system'; label: string; adminOnly?: boolean }> = [
    { id: 'settings', label: 'Configuración' },
    { id: 'filters', label: 'Filtros' },
    { id: 'predefined', label: t.userSettings.predefinedTextsTab },
    ...(user.is_admin ? [
      { id: 'users' as const, label: 'Usuarios', adminOnly: true },
      { id: 'system' as const, label: 'Sistema', adminOnly: true },
    ] : []),
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col">
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Configuración</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* --- Tab: Configuración --- */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Usuario
                </label>
                <input
                  type="text"
                  value={user.username}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="Tu nombre completo"
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Este nombre se registrará cuando crees notas clínicas
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="Dejar en blanco para no cambiar"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="Repetir nueva contraseña"
                  disabled={isSubmitting}
                />
              </div>

              {user.is_admin && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {t.systemSettings.sectionTitle}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-md border border-amber-200 dark:border-amber-900">
                      <input
                        type="checkbox"
                        id="enableReadOnlyMode"
                        checked={enableReadOnlyMode}
                        onChange={(e) => setEnableReadOnlyMode(e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-amber-500 dark:focus:ring-amber-600"
                        disabled={isSubmitting}
                      />
                      <label htmlFor="enableReadOnlyMode" className="flex-1 cursor-pointer">
                        <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          {t.systemSettings.readOnlyModeLabel}
                        </div>
                        <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          {t.systemSettings.readOnlyModeDesc}
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-900">
                      <input
                        type="checkbox"
                        id="enableNewEpisodeButton"
                        checked={enableNewEpisodeButton}
                        onChange={(e) => setEnableNewEpisodeButton(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600"
                        disabled={isSubmitting}
                      />
                      <label htmlFor="enableNewEpisodeButton" className="flex-1 cursor-pointer">
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {t.systemSettings.newEpisodeButtonLabel}
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          {t.systemSettings.newEpisodeButtonDesc}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-md">
                  <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          )}

          {/* --- Tab: Filtros --- */}
          {activeTab === 'filters' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Los filtros activos se aplican al listar episodios. Dejar un campo vacío para no filtrar por ese criterio.
              </p>

              <div className="space-y-4">
                {/* Campo USER para ORU */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-900">
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Usuario ORU
                  </label>
                  <input
                    type="text"
                    value={filtros.user}
                    onChange={(e) => setFiltros(f => ({ ...f, user: e.target.value }))}
                    className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="ej: dr.garcia"
                    disabled={isSubmitting}
                  />
                  <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                    Se incluye en el campo OBR.24 al enviar mensajes HL7 ORU
                  </p>
                </div>

                {/* Filtros de episodios */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Filtros de episodios
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    <div className="p-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo
                      </label>
                      <input
                        type="text"
                        value={filtros.Tipo}
                        onChange={(e) => setFiltros(f => ({ ...f, Tipo: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder="ej: Ambulatorio"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="p-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hospital
                      </label>
                      <input
                        type="text"
                        value={filtros.Hospital}
                        onChange={(e) => setFiltros(f => ({ ...f, Hospital: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder="ej: TCE HOSPITAL BASE"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="p-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Local / Unidad
                      </label>
                      <input
                        type="text"
                        value={filtros.Local}
                        onChange={(e) => setFiltros(f => ({ ...f, Local: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder="ej: Unidad Emergencia Adultos"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="p-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Profesional
                      </label>
                      <input
                        type="text"
                        value={filtros.Profesional}
                        onChange={(e) => setFiltros(f => ({ ...f, Profesional: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder="ej: Dr. Juan Pérez"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-md">
                  <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar filtros'}
                </button>
              </div>
            </form>
          )}

          {/* --- Tab: Textos Predefinidos --- */}
          {activeTab === 'predefined' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.userSettings.predefinedTextsDesc}</p>

              {/* Formulario nuevo texto */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t.userSettings.addText}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={newPTTitle}
                    onChange={e => setNewPTTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder={t.userSettings.newTextTitlePlaceholder}
                    disabled={isSavingPT}
                  />
                  <textarea
                    value={newPTContent}
                    onChange={e => setNewPTContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px] placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder={t.userSettings.newTextContentPlaceholder}
                    disabled={isSavingPT}
                  />
                  <button
                    type="button"
                    onClick={handleAddPT}
                    disabled={!newPTTitle.trim() || !newPTContent.trim() || isSavingPT}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isSavingPT ? '...' : `+ ${t.userSettings.addText}`}
                  </button>
                </div>
              </div>

              {/* Lista de textos existentes */}
              {isLoadingPT ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : predefinedTexts.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">{t.userSettings.noTexts}</p>
              ) : (
                <div className="space-y-3">
                  {predefinedTexts.map(pt => (
                    <div
                      key={pt.id}
                      className={`border rounded-lg overflow-hidden transition-colors ${
                        pt.active
                          ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 opacity-60'
                      }`}
                    >
                      {editingPT?.id === pt.id ? (
                        <div className="p-4 space-y-3">
                          <input
                            type="text"
                            value={editingPT.title}
                            onChange={e => setEditingPT({ ...editingPT, title: e.target.value })}
                            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isSavingPT}
                          />
                          <textarea
                            value={editingPT.content}
                            onChange={e => setEditingPT({ ...editingPT, content: e.target.value })}
                            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px]"
                            disabled={isSavingPT}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSaveEditPT}
                              disabled={isSavingPT}
                              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPT(null)}
                              className="flex-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-medium text-sm text-gray-900 dark:text-gray-50">{pt.title}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Toggle activo */}
                              <button
                                type="button"
                                onClick={() => handleTogglePT(pt)}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                                  pt.active
                                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                                title={pt.active ? t.userSettings.active : t.userSettings.inactive}
                              >
                                {pt.active ? t.userSettings.active : t.userSettings.inactive}
                              </button>
                              {/* Editar */}
                              <button
                                type="button"
                                onClick={() => setEditingPT({ ...pt })}
                                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Editar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {/* Eliminar */}
                              <button
                                type="button"
                                onClick={() => handleDeletePT(pt)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Eliminar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 whitespace-pre-wrap">{pt.content}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                            {new Date(pt.updated_at).toLocaleDateString('es-CL')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* --- Tab: Sistema --- */}
          {activeTab === 'system' && user.is_admin && (
            <div className="space-y-1">
              {isLoadingConfig ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Cargando configuración...</span>
                </div>
              ) : (
                <form onSubmit={handleSaveSystemConfig} className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 pb-1">
                    Estos valores sobrescriben las variables de entorno del servidor. Los cambios toman efecto en el siguiente ciclo de sincronización.
                  </p>

                  {/* Servidor central */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Servidor Central</span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800 p-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Base</label>
                        <input
                          type="text"
                          value={systemConfig.central_url}
                          onChange={e => setSystemConfig(c => ({ ...c, central_url: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          placeholder="http://servidor.central.cl"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="pt-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endpoint Episodios</label>
                        <input
                          type="text"
                          value={systemConfig.central_api_endpoint}
                          onChange={e => setSystemConfig(c => ({ ...c, central_api_endpoint: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          placeholder="/ruta/getData"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="pt-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endpoint HL7 Inbound</label>
                        <input
                          type="text"
                          value={systemConfig.central_hl7_endpoint}
                          onChange={e => setSystemConfig(c => ({ ...c, central_hl7_endpoint: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          placeholder="/ruta/hl7inbound"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="pt-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endpoint Usuarios</label>
                        <input
                          type="text"
                          value={systemConfig.central_users_endpoint}
                          onChange={e => setSystemConfig(c => ({ ...c, central_users_endpoint: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          placeholder="/ruta/getUsers"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Credenciales */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Credenciales API Central</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
                        <input
                          type="text"
                          value={systemConfig.central_api_username}
                          onChange={e => setSystemConfig(c => ({ ...c, central_api_username: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="usuario"
                          disabled={isSubmitting}
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={systemConfig.central_api_password}
                            onChange={e => setSystemConfig(c => ({ ...c, central_api_password: e.target.value }))}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="contraseña"
                            disabled={isSubmitting}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Intervalos */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tiempos de Sincronizacion</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Verificacion conectividad <span className="text-gray-400 font-normal">(seg)</span>
                        </label>
                        <input
                          type="number"
                          min={3}
                          max={60}
                          value={systemConfig.health_check_interval}
                          onChange={e => setSystemConfig(c => ({ ...c, health_check_interval: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sync descendente <span className="text-gray-400 font-normal">(seg)</span>
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={3600}
                          value={systemConfig.downstream_sync_interval}
                          onChange={e => setSystemConfig(c => ({ ...c, downstream_sync_interval: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sync ascendente HL7 <span className="text-gray-400 font-normal">(seg)</span>
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={3600}
                          value={systemConfig.upstream_sync_interval}
                          onChange={e => setSystemConfig(c => ({ ...c, upstream_sync_interval: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Max. reintentos HL7
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={systemConfig.max_retries}
                          onChange={e => setSystemConfig(c => ({ ...c, max_retries: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-md">
                      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-md">
                      <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSystemConfig(originalSystemConfig);
                        setError('');
                        setSuccess('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                      disabled={isSubmitting}
                    >
                      Descartar cambios
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Guardando...' : 'Guardar configuracion'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* --- Tab: Gestión de Usuarios --- */}
          {activeTab === 'users' && user.is_admin && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Usuarios del Sistema</h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((u) => (
                      <div key={u.id} className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{u.username}</span>
                              {u.is_admin && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                                  Administrador
                                </span>
                              )}
                            </div>
                            {u.nombre && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{u.nombre}</p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Estado: {u.active ? 'Activo' : 'Inactivo'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {!showCreateUser ? (
                <button
                  type="button"
                  onClick={() => setShowCreateUser(true)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Crear Nuevo Usuario
                </button>
              ) : (
                <div className="p-6 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-900">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Nuevo Usuario</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateUser(false);
                        setNewUsername('');
                        setNewPassword('');
                        setNewNombre('');
                        setNewIsAdmin(false);
                        setError('');
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Usuario
                      </label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Nombre de usuario"
                        className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        value={newNombre}
                        onChange={(e) => setNewNombre(e.target.value)}
                        placeholder="Nombre completo (opcional)"
                        className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-blue-100 dark:bg-blue-900 rounded-md">
                      <input
                        type="checkbox"
                        id="newIsAdmin"
                        checked={newIsAdmin}
                        onChange={(e) => setNewIsAdmin(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                      <label htmlFor="newIsAdmin" className="flex-1 cursor-pointer">
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Es administrador
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                          Los administradores pueden gestionar usuarios y configuración del sistema
                        </div>
                      </label>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-md">
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-md">
                        <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Creando...' : 'Crear Usuario'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
