import { useState, useEffect } from 'react';
import type { Category } from '@/types';
import { adminService } from '@/services/adminService';

/** Hook to fetch and cache categories */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await adminService.getCategories();
        setCategories(data);
      } catch {
        // Categories might not be available
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, isLoading };
}
