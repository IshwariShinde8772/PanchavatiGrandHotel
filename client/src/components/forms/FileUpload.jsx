export default function FileUpload({ label, accept = "image/*,.pdf", onChange }) {
  return (
    <label className="block">
      {label ? <span className="mb-2 block text-sm font-medium text-darkText">{label}</span> : null}
      <div className="rounded-[24px] border border-dashed border-divider bg-saffronLight/50 p-4">
        <input type="file" accept={accept} onChange={onChange} className="block w-full text-sm" />
        <p className="mt-2 text-xs text-mutedText">Accepted: JPG, PNG, PDF up to 5MB</p>
      </div>
    </label>
  );
}

