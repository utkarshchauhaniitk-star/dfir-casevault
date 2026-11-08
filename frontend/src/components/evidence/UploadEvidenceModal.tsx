import React, { useState } from 'react';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Case } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cases?: Case[];
  defaultCaseId?: string;
  onUploadSuccess: () => void;
  onUpload: (caseId: string, formData: FormData) => Promise<any>;
}

export const UploadEvidenceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  cases = [],
  defaultCaseId = '',
  onUploadSuccess,
  onUpload,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState(defaultCaseId);
  const [collectionSource, setCollectionSource] = useState('');
  const [investigator, setInvestigator] = useState('Lead Forensic Investigator (Demo)');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (defaultCaseId) setSelectedCaseId(defaultCaseId);
    else if (cases.length > 0 && !selectedCaseId) setSelectedCaseId(cases[0].case_id);
  }, [defaultCaseId, cases]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 25 * 1024 * 1024) {
        setError('File exceeds 25 MB maximum upload limit.');
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) {
      setError('Please select or specify a target case.');
      return;
    }
    if (!file) {
      setError('Please select an evidence file to ingest.');
      return;
    }
    if (!collectionSource.trim()) {
      setError('Please specify the evidence acquisition source.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_source', collectionSource);
    formData.append('investigator', investigator);
    if (description) formData.append('description', description);

    try {
      await onUpload(selectedCaseId, formData);
      setFile(null);
      setCollectionSource('');
      setDescription('');
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Evidence upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ingest Digital Evidence Artifact">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!defaultCaseId && cases.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Associate with Case *
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              {cases.map((c) => (
                <option key={c.case_id} value={c.case_id}>
                  {c.case_id} &mdash; {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Acquisition Source / Origin *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Workstation DISK-01 (/var/log/auth.log) or Memory Dump PID 14050"
            value={collectionSource}
            onChange={(e) => setCollectionSource(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Acquiring Investigator
          </label>
          <input
            type="text"
            value={investigator}
            onChange={(e) => setInvestigator(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Evidence Artifact File * (TXT, CSV, JSON, LOG, PDF, PNG, JPG, ZIP)
          </label>
          <div className="relative border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center bg-slate-950/60 transition-colors">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              {file ? (
                <div className="flex items-center space-x-2 text-sm text-slate-200">
                  <File className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold">{file.name}</span>
                  <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-300">
                    Click to browse or drop forensic artifact
                  </p>
                  <p className="text-xs text-slate-500">
                    Max size: 25 MB &bull; SHA-256 calculated on ingest
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Forensic Description / Triage Notes
          </label>
          <textarea
            rows={2}
            placeholder="Context regarding how artifact was extracted, chain of custody notes, or tool versions..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading || !file}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-lg shadow-blue-600/30 disabled:opacity-50"
          >
            {uploading ? 'Calculating SHA-256 & Ingesting...' : 'Ingest & Hash Evidence'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
