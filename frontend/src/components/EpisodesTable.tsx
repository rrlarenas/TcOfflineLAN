import { useState, useMemo } from 'react';
import type { Episode } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseServerDate } from '../lib/timeAgo';

type SortKey = 'paciente' | 'run' | 'num_episodio' | 'profesional' | 'ubicacion' | 'fecha_atencion';
type SortDir = 'asc' | 'desc';

interface SortState {
  key: SortKey;
  dir: SortDir;
}

interface EpisodesTableProps {
  episodes: Episode[];
  onEpisodeClick: (episodeId: number) => void;
}

export function EpisodesTable({ episodes, onEpisodeClick }: EpisodesTableProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'fecha_atencion', dir: 'desc' });

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = parseServerDate(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const monthsEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const months = language === 'es' ? monthsEs : monthsEn;
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const toCamelCase = (text: string) =>
    text
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const truncateName = (name: string, maxLength = 40) => {
    if (!name || name === '-') return name;
    const cc = toCamelCase(name);
    return cc.length <= maxLength ? cc : cc.substring(0, maxLength) + '...';
  };

  const handleSortClick = (key: SortKey) => {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? episodes.filter(
          e =>
            (e.paciente || '').toLowerCase().includes(q) ||
            (e.run || '').toLowerCase().includes(q) ||
            (e.num_episodio || '').toLowerCase().includes(q) ||
            (e.profesional || '').toLowerCase().includes(q)
        )
      : episodes;

    return [...filtered].sort((a, b) => {
      let av: string | number;
      let bv: string | number;

      if (sort.key === 'fecha_atencion') {
        av = a.fecha_atencion ? parseServerDate(a.fecha_atencion).getTime() : 0;
        bv = b.fecha_atencion ? parseServerDate(b.fecha_atencion).getTime() : 0;
      } else {
        av = (a[sort.key] || '').toLowerCase();
        bv = (b[sort.key] || '').toLowerCase();
      }

      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [episodes, search, sort]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    const isActive = sort.key === col;
    if (!isActive) {
      return (
        <svg
          className="ml-1 w-3.5 h-3.5 opacity-25 group-hover:opacity-50 transition-opacity flex-shrink-0"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M8 3l3.5 5h-7L8 3z" />
          <path d="M8 13L4.5 8h7L8 13z" />
        </svg>
      );
    }
    return sort.dir === 'asc' ? (
      <svg className="ml-1 w-3.5 h-3.5 text-blue-500 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 3l3.5 5h-7L8 3z" />
      </svg>
    ) : (
      <svg className="ml-1 w-3.5 h-3.5 text-blue-500 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 13L4.5 8h7L8 13z" />
      </svg>
    );
  };

  const sortableTh = (col: SortKey, label: string, widthClass: string) => (
    <th
      onClick={() => handleSortClick(col)}
      className={`${widthClass} px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
    >
      <span className="flex items-center">
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  );

  if (episodes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 text-lg">{t.episodes.noEpisodesInCategory}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.episodes.searchPlaceholder}
          className="w-full pl-10 pr-10 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Limpiar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {search && (
        <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
          {filteredAndSorted.length}{' '}
          {language === 'es'
            ? `resultado${filteredAndSorted.length !== 1 ? 's' : ''}`
            : `result${filteredAndSorted.length !== 1 ? 's' : ''}`}
        </p>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 w-full">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-800 table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {sortableTh('paciente', t.episodes.patient, 'w-[15%]')}
                {sortableTh('run', t.episodes.run, 'w-[10%]')}
                {sortableTh('num_episodio', t.episodes.episode, 'w-[9%]')}
                {sortableTh('profesional', t.episodes.professional, 'w-[14%]')}
                {sortableTh('ubicacion', t.episodes.location, 'w-[13%]')}
                {sortableTh('fecha_atencion', t.episodes.dateAttention, 'w-[17%]')}
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[14%]">
                  {t.episodes.sync}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                    {t.episodes.noSearchResults}
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map(episode => {
                  const hasUnsynedNotes = episode.pending_notes_count > 0;
                  return (
                    <tr
                      key={episode.id}
                      onClick={() => onEpisodeClick(episode.id)}
                      className="hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3 whitespace-nowrap overflow-hidden text-ellipsis">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {truncateName(episode.paciente || '-')}
                          </div>
                          {!episode.synced_flag && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 whitespace-nowrap">
                              {t.episodes.syncStatus.new}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap overflow-hidden text-ellipsis">
                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {episode.run || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap overflow-hidden text-ellipsis">
                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {episode.num_episodio}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap overflow-hidden text-ellipsis">
                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {episode.profesional || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap overflow-hidden text-ellipsis">
                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {episode.ubicacion || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap overflow-hidden text-ellipsis">
                        <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {formatDateTime(episode.fecha_atencion)}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {episode.synced_flag && !hasUnsynedNotes ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {t.episodes.syncStatus.synced}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {t.episodes.syncStatus.pendingCount}
                            {hasUnsynedNotes ? ` (${episode.pending_notes_count})` : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
