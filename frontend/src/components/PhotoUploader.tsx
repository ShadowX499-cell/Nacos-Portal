import { useRef, useState } from 'react';
import { Camera, X, Upload } from 'lucide-react';

interface Props {
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function PhotoUploader({ currentUrl, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState('');

  function handleFile(file: File) {
    setError('');
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('Only JPEG or PNG images allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleRemove() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Preview / drop zone */}
      <div
        className={`relative w-28 h-28 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${
          disabled ? 'opacity-60 cursor-not-allowed border-gray-200 bg-gray-50' : 'cursor-pointer border-brand-300 bg-brand-50 hover:border-brand-500 hover:bg-brand-100'
        }`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={!disabled ? handleDrop : undefined}
        onDragOver={(e) => e.preventDefault()}
      >
        {preview ? (
          <>
            <img src={preview} alt="Passport photo" className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 p-2 text-center">
            <Camera className="w-7 h-7 text-brand-400" />
            <span className="text-[10px] text-brand-500 font-medium leading-tight">
              {disabled ? 'No photo' : 'Upload photo'}
            </span>
          </div>
        )}
      </div>

      {/* Upload button */}
      {!disabled && !preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900 border border-brand-200 hover:border-brand-400 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Choose file
        </button>
      )}

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      <p className="text-[10px] text-gray-400 text-center">
        JPEG or PNG · max 2 MB
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
    </div>
  );
}
