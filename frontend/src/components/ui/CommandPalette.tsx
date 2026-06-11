import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Search, Home, Users, Calendar, Heart, Settings, User, Tag, Trophy, Shield, Bell, Palette, Clock, List, FolderOpen } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';
import { getSearchIndexForRole, type SearchIndexItem } from '@/utils/searchIndex';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  group: string;
  keywords?: string[];
}

const iconMap: Record<SearchIndexItem['icon'], React.ReactNode> = {
  home: <Home className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  heart: <Heart className="w-4 h-4" />,
  tag: <Tag className="w-4 h-4" />,
  trophy: <Trophy className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  shield: <Shield className="w-4 h-4" />,
  bell: <Bell className="w-4 h-4" />,
  palette: <Palette className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  user: <User className="w-4 h-4" />,
  list: <List className="w-4 h-4" />,
  folder: <FolderOpen className="w-4 h-4" />,
  search: <Search className="w-4 h-4" />,
};

/** Global command palette (Cmd+K) for quick navigation and actions */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const items: CommandItem[] = getSearchIndexForRole(user?.role).map((item) => ({
    id: item.id,
    label: item.title,
    icon: iconMap[item.icon],
    path: item.path,
    group: item.type === 'page' ? 'Pages' : item.type === 'setting' ? 'Settings' : 'Features & Actions',
    keywords: [item.subtitle, item.path, item.type, ...item.keywords],
  }));
  const groups = Array.from(new Set(items.map((item) => item.group)));

  const handleSelect = (item: CommandItem) => {
    navigate(item.path);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Command dialog */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg animate-scale-in">
        <Command
          className={cn(
            'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden'
          )}
          loop
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex-1 py-3 text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No results found.
            </Command.Empty>

            {groups.map((group) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-gray-500 dark:[&_[cmdk-group-heading]]:text-gray-400"
              >
                {items
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.keywords?.join(' ') || ''}`}
                      onSelect={() => handleSelect(item)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors',
                        'text-gray-700 dark:text-gray-300',
                        'aria-selected:bg-primary-50 dark:aria-selected:bg-primary-900/20',
                        'aria-selected:text-primary-700 dark:aria-selected:text-primary-300'
                      )}
                    >
                      <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Command.Item>
                  ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
