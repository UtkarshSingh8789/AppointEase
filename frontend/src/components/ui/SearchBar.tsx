import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { debounce } from '@/utils';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  defaultValue?: string;
  className?: string;
}

/** Search input with debounced search callback */
export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  onSearch,
  defaultValue = '',
  className = '',
}) => {
  const [value, setValue] = useState(defaultValue);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query);
    }, 300),
    [onSearch]
  );

  useEffect(() => {
    debouncedSearch(value);
  }, [value, debouncedSearch]);

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                   placeholder:text-gray-400 transition-colors"
        aria-label="Search"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
