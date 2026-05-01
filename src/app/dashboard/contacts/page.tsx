"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Contact, CreateContactInput } from "@/lib/types/contacts";
import { useTenantFeatures } from "@/context/TenantFeaturesContext";
import { useLanguage } from "@/context/LanguageContext";
import { Mail, Phone, MessageCircle, MapPin, Building2, Briefcase, Edit2, Trash2, Plus, X, Clock, User, CheckCircle, Image, FileText } from "lucide-react";
import { Container, Section } from "@/components/StripeUIComponents";
import { SearchInput, DashboardHeader, FlashMessage, useFlash, EmptyState } from "@/components";

const EMPTY_FORM: CreateContactInput = {
  full_name: "",
  email: "",
  phone_number: "",
  whatsapp_number: "",
  company_name: "",
  address: "",
  city: "",
  country: "",
  postal_code: "",
  position: "",
  notes: "",
  google_maps_link: "",
};

export default function ContactsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { features } = useTenantFeatures();
  const { t } = useLanguage();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateContactInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { flash, showFlash, clearFlash } = useFlash();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Check permissions - Admins always have access
  if (user?.roleId !== "admin" && !user?.hasPermission?.("contacts.view")) {
    return <div className="p-4">{t("contacts.noPermission")}</div>;
  }

  const tenantId = user?.tenantId || sessionStorage.getItem("defaultTenantId");

  // Load contacts
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: search || "",
        pageSize: "100",
      });
      const res = await fetch(`/api/tenants/${tenantId}/contacts?${params}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (err) {
      console.error("Error loading contacts:", err);
      showFlash("error", t("contacts.flashErrorLoad"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, search]);



  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !form.full_name.trim()) {
      showFlash("error", t("contacts.nameRequired"));
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/tenants/${tenantId}/contacts/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(t("contacts.flashErrorSave"));
        showFlash("success", t("contacts.flashUpdated"));
      } else {
        // Create
        const res = await fetch(`/api/tenants/${tenantId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(t("contacts.flashErrorSave"));
        showFlash("success", t("contacts.flashCreated"));
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      setPhotoPreview(null);
      await loadContacts();
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : t("contacts.flashErrorSave"));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    const MAX_SIZE_MB = 2;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      showFlash("error", t("contacts.flashPhotoTooBig", { max: MAX_SIZE_MB }));
      setPhotoPreview(null);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "contact");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(t("contacts.flashPhotoError"));
      const data = await res.json();
      setForm({ ...form, photo_url: data.url });
      showFlash("success", t("contacts.flashPhotoSuccess"));
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : t("contacts.flashPhotoError"));
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEdit = (contact: Contact) => {
    setForm({
      full_name: contact.full_name,
      email: contact.email,
      phone_number: contact.phone_number,
      whatsapp_number: contact.whatsapp_number,
      company_name: contact.company_name,
      address: contact.address,
      city: contact.city,
      country: contact.country,
      postal_code: contact.postal_code,
      position: contact.position,
      notes: contact.notes,
      google_maps_link: contact.google_maps_link,
      photo_url: contact.photo_url,
    });
    setPhotoPreview(contact.photo_url || null);
    setEditingId(contact.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!tenantId || !confirm(t("contacts.deleteConfirm"))) return;
    try {
      const res = await fetch(`/api/tenants/${tenantId}/contacts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(t("contacts.flashErrorDelete"));
      showFlash("success", t("contacts.flashDeleted"));
      await loadContacts();
    } catch (err) {
      showFlash("error", err instanceof Error ? err.message : t("contacts.flashErrorDelete"));
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  return (
    <Container>
      <Section>
        <DashboardHeader
          pageType="contacts"
          title={t("contacts.title")}
          subtitle={t("contacts.subtitle")}
        >
          {(user?.roleId === "admin" || user?.hasPermission?.("contacts.create")) && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("contacts.newContact")}
            </button>
          )}
        </DashboardHeader>

        {/* Flash message */}
        <FlashMessage flash={flash} onDismiss={clearFlash} />

        {/* Search */}
        <div className="mb-6">
          <SearchInput
            value={search}
            onChange={(value) => setSearch(value)}
            placeholder={t("contacts.searchPlaceholder")}
            className="flex-1"
          />
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? t("contacts.formEdit") : t("contacts.formAdd")}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                {/* Basic Info */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">{t("contacts.sectionBasic")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t("contacts.labelFullName")}
                      </label>
                      <input
                        required
                        type="text"
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder={t("contacts.placeholderName")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t("contacts.labelPosition")}
                      </label>
                      <input
                        type="text"
                        value={form.position || ""}
                        onChange={(e) => setForm({ ...form, position: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder={t("contacts.placeholderPosition")}
                      />
                    </div>
                  </div>
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t("contacts.labelCompany")}
                  </label>
                  <input
                    type="text"
                    value={form.company_name || ""}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder={t("contacts.placeholderCompany")}
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("contacts.labelPhoto")}
                  </label>
                  <div className="flex gap-4 items-start">
                    {/* Preview */}
                    {(photoPreview || form.photo_url) && (
                      <div className="flex-shrink-0">
                        <img
                          src={photoPreview || form.photo_url}
                          alt="Preview"
                          className="w-32 h-32 rounded-lg object-cover border border-slate-200"
                        />
                      </div>
                    )}
                    {/* Upload Input */}
                    <div className="flex-1">
                      <label className="relative cursor-pointer">
                        <div className="px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-purple-400 transition-colors text-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            disabled={uploadingPhoto}
                            className="hidden"
                          />
                          <p className="text-sm text-slate-600">
                            {uploadingPhoto ? t("contacts.photoUploading") : t("contacts.photoUpload")}
                          </p>
                        </div>
                      </label>
                      <p className="text-xs text-slate-500 mt-2">
                        {t("contacts.photoHint")}
                      </p>
                      {form.photo_url && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ ...form, photo_url: undefined });
                            setPhotoPreview(null);
                          }}
                          className="mt-2 text-sm text-slate-500 hover:text-red-600 transition-colors"
                        >
                          {t("contacts.photoRemove")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Methods */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">{t("contacts.sectionContact")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t("contacts.labelEmail")}
                      </label>
                      <input
                        type="email"
                        value={form.email || ""}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder={t("contacts.placeholderEmail")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t("contacts.labelPhone")}
                      </label>
                      <input
                        type="tel"
                        value={form.phone_number || ""}
                        onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder={t("contacts.placeholderPhone")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t("contacts.labelWhatsapp")}
                      </label>
                      <input
                        type="tel"
                        value={form.whatsapp_number || ""}
                        onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder={t("contacts.placeholderPhone")}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t("contacts.labelGoogleMaps")}
                      </label>
                      <input
                        type="url"
                        value={form.google_maps_link || ""}
                        onChange={(e) => setForm({ ...form, google_maps_link: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder={t("contacts.placeholderMaps")}
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">{t("contacts.sectionAddress")}</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={form.address || ""}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder={t("contacts.placeholderAddress")}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        value={form.city || ""}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder={t("contacts.placeholderCity")}
                      />
                      <input
                        type="text"
                        value={form.country || ""}
                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder={t("contacts.placeholderCountry")}
                      />
                      <input
                        type="text"
                        value={form.postal_code || ""}
                        onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                        placeholder={t("contacts.placeholderPostal")}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("contacts.labelNotes")}</label>
                  <textarea
                    value={form.notes || ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                    placeholder={t("contacts.placeholderNotes")}
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold rounded-lg transition-colors"
                  >
                    {saving ? t("contacts.saving") : editingId ? t("contacts.update") : t("contacts.save")}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                  >
                    {t("contacts.cancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Two Column Layout: List + Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contacts List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-700">
                  {contacts.length === 1
                    ? t("contacts.count", { count: contacts.length })
                    : t("contacts.countPlural", { count: contacts.length })}
                </p>
              </div>
              
              {loading ? (
                <EmptyState state="loading" message={t("contacts.loading")} />
              ) : contacts.length === 0 ? (
                <EmptyState
                  state="empty"
                  message={t("contacts.empty")}
                  action={
                    (user?.roleId === "admin" || user?.hasPermission?.("contacts.create"))
                      ? { label: t("contacts.createFirst"), onClick: () => setShowForm(true) }
                      : undefined
                  }
                />
              ) : (
                <div className="divide-y divide-slate-200 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-l-4 ${
                        selectedContact?.id === contact.id
                          ? "border-l-purple-600 bg-purple-50"
                          : "border-l-transparent"
                      }`}
                    >
                      <p className="font-medium text-slate-900 truncate">
                        {contact.full_name}
                      </p>
                      {contact.position && (
                        <p className="text-xs text-slate-600 truncate">
                          {contact.position}
                        </p>
                      )}
                      {contact.company_name && (
                        <p className="text-xs text-slate-500 truncate">
                          {contact.company_name}
                        </p>
                      )}
                      {(contact.phone_number || contact.whatsapp_number) && (
                        <p className="text-xs text-purple-600 truncate mt-1">
                          {contact.phone_number || contact.whatsapp_number}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contact Detail Panel */}
          <div className="lg:col-span-2">
            {selectedContact ? (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200">
                  <div className="flex gap-4 flex-1 items-center">
                    {/* Photo */}
                    {selectedContact.photo_url && (
                      <div className="flex-shrink-0">
                        <img
                          src={selectedContact.photo_url}
                          alt={selectedContact.full_name}
                          className="w-24 h-24 rounded-lg object-cover border border-slate-200"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900">
                        {selectedContact.full_name}
                      </h2>
                      {selectedContact.position && (
                        <p className="text-sm text-slate-600 mt-1">
                          {selectedContact.position}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {(user?.roleId === "admin" || user?.hasPermission?.("contacts.edit")) && (
                      <button
                        onClick={() => handleEdit(selectedContact)}
                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                    {(user?.roleId === "admin" || user?.hasPermission?.("contacts.delete")) && (
                      <button
                        onClick={() => {
                          handleDelete(selectedContact.id);
                          setSelectedContact(null);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Company */}
                {selectedContact.company_name && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {t("contacts.sectionCompany")}
                    </h3>
                    <p className="text-slate-900">{selectedContact.company_name}</p>
                  </div>
                )}

                {/* Contact Methods */}
                {(selectedContact.email ||
                  selectedContact.phone_number ||
                  selectedContact.whatsapp_number) && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      {t("contacts.sectionContact")}
                    </h3>
                    <div className="space-y-2">
                      {selectedContact.email && (
                        <a
                          href={`mailto:${selectedContact.email}`}
                          className="flex items-center gap-3 text-slate-700 hover:text-purple-600 transition-colors"
                        >
                          <Mail className="w-4 h-4 text-slate-400" />
                          {selectedContact.email}
                        </a>
                      )}
                      {selectedContact.phone_number && (
                        <a
                          href={`tel:${selectedContact.phone_number}`}
                          className="flex items-center gap-3 text-slate-700 hover:text-purple-600 transition-colors"
                        >
                          <Phone className="w-4 h-4 text-slate-400" />
                          {selectedContact.phone_number}
                        </a>
                      )}
                      {selectedContact.whatsapp_number && (
                        <a
                          href={`https://wa.me/${selectedContact.whatsapp_number.replace(
                            /\D/g,
                            ""
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-slate-700 hover:text-green-600 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4 text-slate-400" />
                          {selectedContact.whatsapp_number}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Address */}
                {(selectedContact.address ||
                  selectedContact.city ||
                  selectedContact.country) && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {t("contacts.sectionAddress")}
                    </h3>
                    <div className="text-slate-900 space-y-1">
                      {selectedContact.address && <p>{selectedContact.address}</p>}
                      <p>
                        {[
                          selectedContact.postal_code,
                          selectedContact.city,
                          selectedContact.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Google Maps Link */}
                {selectedContact.google_maps_link && (
                  <div className="mb-6">
                    <a
                      href={selectedContact.google_maps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm"
                    >
                      {t("contacts.viewMaps")}
                    </a>
                  </div>
                )}

                {/* WhatsApp Conversation Link */}
                {selectedContact.whatsapp_conversation_url && (
                  <div className="mb-6">
                    <a
                      href={selectedContact.whatsapp_conversation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-medium rounded-lg transition-colors text-sm border border-green-200"
                    >
                      <FileText className="w-4 h-4" />
                      {t("contacts.viewWhatsapp")}
                    </a>
                  </div>
                )}

                {/* Notes */}
                {selectedContact.notes && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">{t("contacts.labelNotes")}</h3>
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {selectedContact.notes}
                    </p>
                  </div>
                )}

                {/* Audit Information */}
                <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">{t("contacts.sectionInfo")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-slate-600">{t("contacts.labelStatus")}</p>
                        <p className={`font-medium ${selectedContact.is_active ? "text-green-700" : "text-slate-400"}`}>
                          {selectedContact.is_active ? t("contacts.statusActive") : t("contacts.statusInactive")}
                        </p>
                      </div>
                    </div>
                    
                    {/* Created By */}
                    {selectedContact.created_by && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-slate-600">{t("contacts.labelCreatedBy")}</p>
                          <p className="font-medium text-slate-900">{selectedContact.created_by}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Created At */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-slate-600">{t("contacts.labelCreated")}</p>
                        <p className="font-medium text-slate-900">
                          {new Date(selectedContact.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {/* Updated At */}
                    {selectedContact.updated_at && selectedContact.updated_at !== selectedContact.created_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-slate-600">{t("contacts.labelModified")}</p>
                          <p className="font-medium text-slate-900">
                            {new Date(selectedContact.updated_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
                <p className="text-slate-500 mb-4">{t("contacts.selectToView")}</p>
              </div>
            )}
          </div>
        </div>
      </Section>
    </Container>
  );
}
