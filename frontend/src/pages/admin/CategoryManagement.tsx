import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, FolderOpen, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminService } from '@/services/adminService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTransition } from '@/components/layout/PageTransition';
import { formatDate } from '@/utils';
import type { Category } from '@/types';
import toast from 'react-hot-toast';

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export const CategoryManagement: React.FC = () => {
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getCategories();
      setCategories(data);
    } catch {
      // Error handled by interceptor
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [location.search]);

  const openCreateModal = () => {
    setEditingCategory(null);
    reset({ name: '', description: '', icon: '' });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
    });
    setShowModal(true);
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await adminService.updateCategory(editingCategory.id, data);
        toast.success('Category updated');
      } else {
        await adminService.createCategory(data);
        toast.success('Category created');
      }
      setShowModal(false);
      fetchCategories();
    } catch {
      toast.error('Failed to save category');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminService.deleteCategory(id);
      toast.success('Category deleted');
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete category');
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading categories..." />;
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Category Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{categories.length} service categories</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
          Add Category
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search categories..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
        />
      </div>

      {/* Categories list */}
      {(() => {
        const filtered = searchQuery
          ? categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
          : categories;
        return filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-8 h-8 text-gray-400" />}
          title="No categories yet"
          description="Create service categories for providers to organize their services"
          action={
            <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              Create First Category
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((category) => (
            <Card key={category.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-xs text-gray-400">
                      Created {formatDate(category.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(category)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    aria-label="Edit category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(category.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {category.description && (
                <p className="text-sm text-gray-500 mt-3">{category.description}</p>
              )}
              <div className="mt-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    category.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {category.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      );
      })()}

      {/* Create/Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g., Healthcare, Beauty, Legal"
            error={errors.name?.message}
            {...register('name')}
          />
          <TextArea
            label="Description (optional)"
            placeholder="Brief description of this category..."
            error={errors.description?.message}
            {...register('description')}
          />
          <Input
            label="Icon (optional)"
            placeholder="e.g., stethoscope, scissors"
            helperText="Icon name for display purposes"
            error={errors.icon?.message}
            {...register('icon')}
          />
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Category"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to delete this category? This action cannot be undone.
          Providers in this category may be affected.
        </p>
      </Modal>
    </div>
    </PageTransition>
  );
};
