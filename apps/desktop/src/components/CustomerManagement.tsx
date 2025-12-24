// Customer Management Component
// Full CRUD interface for managing customers

import { useState, useEffect } from 'react';
import customerService, { type Customer, type CustomerFormData } from '../services/CustomerService';

interface CustomerManagementProps {
    onClose: () => void;
}

export default function CustomerManagement({ onClose }: CustomerManagementProps) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [customerType, setCustomerType] = useState<'all' | 'individual' | 'company'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCustomers, setTotalCustomers] = useState(0);

    const [showForm, setShowForm] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // Form state
    const [formData, setFormData] = useState<CustomerFormData>({
        name: '',
        phone: '',
        email: '',
        address: '',
        customerType: 'individual',
        taxId: '',
        cnamNumber: ''
    });

    useEffect(() => {
        loadCustomers();
    }, [currentPage, searchTerm, customerType]);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const response = await customerService.getAll({
                page: currentPage,
                limit: 20,
                search: searchTerm,
                customerType
            });

            setCustomers(response.data);
            setTotalPages(response.pagination.totalPages);
            setTotalCustomers(response.pagination.total);
        } catch (error: any) {
            showMessage('error', error.message || 'Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleCreate = () => {
        setEditingCustomer(null);
        setFormData({
            name: '',
            phone: '',
            email: '',
            address: '',
            customerType: 'individual',
            taxId: '',
            cnamNumber: ''
        });
        setShowForm(true);
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            customerType: customer.customerType,
            taxId: customer.taxId || '',
            cnamNumber: customer.cnamNumber || ''
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Clean form data - remove empty strings
            const cleanData: CustomerFormData = {
                name: formData.name.trim(),
                phone: formData.phone?.trim() || undefined,
                email: formData.email?.trim() || undefined,
                address: formData.address?.trim() || undefined,
                customerType: formData.customerType,
                taxId: formData.taxId?.trim() || undefined,
                cnamNumber: formData.cnamNumber?.trim() || undefined
            };

            if (editingCustomer) {
                await customerService.update(editingCustomer.id, cleanData);
                showMessage('success', 'Customer updated successfully');
            } else {
                await customerService.create(cleanData);
                showMessage('success', 'Customer created successfully');
            }

            setShowForm(false);
            loadCustomers();
        } catch (error: any) {
            showMessage('error', error.message || 'Failed to save customer');
        }
    };

    const handleDelete = async (customer: Customer) => {
        if (!confirm(`Are you sure you want to delete "${customer.name}"?`)) {
            return;
        }

        try {
            await customerService.delete(customer.id);
            showMessage('success', 'Customer deleted successfully');
            loadCustomers();
        } catch (error: any) {
            showMessage('error', error.message || 'Failed to delete customer');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                        <svg className="h-7 w-7 mr-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Customer Management
                        <span className="ml-3 text-sm font-normal text-gray-400">
                            ({totalCustomers} total)
                        </span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-100 transition-colors"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Message Banner */}
                {message && (
                    <div className={`mx-6 mt-4 p-3 rounded-lg border ${message.type === 'success' ? 'bg-success/10 border-success text-success' :
                        message.type === 'error' ? 'bg-danger/10 border-danger text-danger' :
                            'bg-info/10 border-info text-info'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-dark-border flex gap-4 items-center flex-shrink-0">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search by name, phone, email, or address..."
                            className="w-full pl-10"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={customerType}
                        onChange={(e) => {
                            setCustomerType(e.target.value as any);
                            setCurrentPage(1);
                        }}
                        className="w-48"
                    >
                        <option value="all">All Types</option>
                        <option value="individual">Individual</option>
                        <option value="company">Company</option>
                    </select>

                    {/* Add Button */}
                    <button
                        onClick={handleCreate}
                        className="btn-primary px-6 py-2 flex items-center gap-2 whitespace-nowrap"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Customer
                    </button>
                </div>

                {/* Customer List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-gray-400">Loading customers...</div>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <svg className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p>No customers found</p>
                            <button onClick={handleCreate} className="btn-primary mt-4 px-6 py-2">
                                Add Your First Customer
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {customers.map((customer) => (
                                <div
                                    key={customer.id}
                                    className="p-4 bg-dark-elevated border border-dark-border rounded-lg hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-bold text-lg text-gray-100">{customer.name}</h3>
                                                <span className={`text-xs px-2 py-1 rounded ${customer.customerType === 'company'
                                                    ? 'bg-primary/20 text-primary border border-primary/30'
                                                    : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
                                                    }`}>
                                                    {customer.customerType === 'company' ? '🏢 Company' : '👤 Individual'}
                                                </span>
                                                {customer._count && customer._count.invoices > 0 && (
                                                    <span className="text-xs px-2 py-1 rounded bg-success/20 text-success border border-success/30">
                                                        {customer._count.invoices} invoice{customer._count.invoices !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-400">
                                                {customer.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                        {customer.phone}
                                                    </div>
                                                )}
                                                {customer.email && (
                                                    <div className="flex items-center gap-2">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                        {customer.email}
                                                    </div>
                                                )}
                                                {customer.address && (
                                                    <div className="flex items-center gap-2 col-span-2">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        {customer.address}
                                                    </div>
                                                )}
                                                {customer.taxId && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Tax ID:</span> {customer.taxId}
                                                    </div>
                                                )}
                                                {customer.cnamNumber && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">CNAM:</span> {customer.cnamNumber}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(customer)}
                                                className="btn-secondary px-3 py-2 text-sm"
                                                title="Edit Customer"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer)}
                                                className="btn-danger px-3 py-2 text-sm"
                                                title="Delete Customer"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-dark-border flex items-center justify-between flex-shrink-0">
                        <div className="text-sm text-gray-400">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Customer Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
                        <div className="sticky top-0 bg-dark-surface px-6 py-4 border-b border-dark-border">
                            <h3 className="text-xl font-bold text-gray-100">
                                {editingCustomer ? 'Edit Customer' : 'New Customer'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="label">
                                    Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full"
                                    placeholder="Customer name"
                                    autoFocus
                                />
                            </div>

                            {/* Customer Type */}
                            <div>
                                <label className="label">Customer Type</label>
                                <select
                                    value={formData.customerType}
                                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as any })}
                                    className="w-full"
                                >
                                    <option value="individual">👤 Individual</option>
                                    <option value="company">🏢 Company</option>
                                </select>
                            </div>

                            {/* Phone & Email */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full"
                                        placeholder="Phone number"
                                    />
                                </div>
                                <div>
                                    <label className="label">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full"
                                        placeholder="Email address"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="label">Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full"
                                    rows={2}
                                    placeholder="Full address"
                                />
                            </div>

                            {/* Tax ID & CNAM (for companies) */}
                            {formData.customerType === 'company' && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                    <div>
                                        <label className="label">Tax ID</label>
                                        <input
                                            type="text"
                                            value={formData.taxId}
                                            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                            className="w-full"
                                            placeholder="Company tax ID"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">CNAM Number</label>
                                        <input
                                            type="text"
                                            value={formData.cnamNumber}
                                            onChange={(e) => setFormData({ ...formData, cnamNumber: e.target.value })}
                                            className="w-full"
                                            placeholder="CNAM number"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 btn-secondary py-3"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 btn-primary py-3"
                                >
                                    {editingCustomer ? 'Update Customer' : 'Create Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
