import React, { useEffect, useState } from "react";
import { MessageSquare, Save, X } from "lucide-react";

import {
  MAX_COMMENT_LENGTH,
  DEFAULT_PRESELECTION_COMMENT,
} from "../../constants/preselection";

interface PreselectionCommentProps {
  initialValue?: string;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
  placeholder?: string;
  onSave: (comment: string) => Promise<void> | void;
  onCancel?: () => void;
}

const PreselectionComment: React.FC<PreselectionCommentProps> = ({
  initialValue = "",
  loading = false,
  disabled = false,
  title = "Reviewer Comment",
  placeholder = "Write your review...",
  onSave,
  onCancel,
}) => {
  const [comment, setComment] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setComment(initialValue);
  }, [initialValue]);

  const remainingCharacters =
    MAX_COMMENT_LENGTH - comment.length;

  const handleSave = async () => {
    try {
      setSaving(true);

      await onSave(
        comment.trim() || DEFAULT_PRESELECTION_COMMENT
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-indigo-600" />

        <h3 className="font-semibold text-slate-800">
          {title}
        </h3>
      </div>

      <textarea
        value={comment}
        disabled={disabled || loading || saving}
        onChange={(e) =>
          setComment(
            e.target.value.slice(0, MAX_COMMENT_LENGTH)
          )
        }
        rows={5}
        placeholder={placeholder}
        className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
      />

      <div className="mt-2 flex items-center justify-between text-xs">
        <span
          className={
            remainingCharacters < 50
              ? "text-red-500"
              : "text-slate-500"
          }
        >
          {remainingCharacters} characters remaining
        </span>

        {comment.trim().length === 0 && (
          <span className="text-slate-400">
            Default comment will be used.
          </span>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />

            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving || disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />

          {saving ? "Saving..." : "Save Comment"}
        </button>
      </div>
    </div>
  );
};

export default PreselectionComment;