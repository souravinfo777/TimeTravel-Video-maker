import React, { useEffect, useState } from 'react';
import { FolderOpen, Plus, Save, Trash2 } from 'lucide-react';
import { SavedProject } from '../types';

interface ProjectHistoryProps {
  projects: SavedProject[];
  currentProjectId?: string;
  suggestedName: string;
  hasProjectData: boolean;
  onSave: (name: string) => void;
  onLoad: (project: SavedProject) => void;
  onDelete: (project: SavedProject) => void;
  onNewProject: () => void;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ProjectHistory({ projects, currentProjectId, suggestedName, hasProjectData, onSave, onLoad, onDelete, onNewProject }: ProjectHistoryProps) {
  const [projectName, setProjectName] = useState(suggestedName);
  const [confirmingNew, setConfirmingNew] = useState(false);

  useEffect(() => {
    setProjectName(suggestedName);
  }, [suggestedName]);

  const handleSave = () => {
    onSave(projectName.trim() || suggestedName);
    setConfirmingNew(false);
  };

  const handleNewClick = () => {
    if (hasProjectData) {
      setConfirmingNew(true);
      return;
    }
    onNewProject();
  };

  const confirmNewProject = () => {
    onNewProject();
    setConfirmingNew(false);
  };

  return (
    <section className="p-5 border-b border-zinc-800 bg-zinc-900/80">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <FolderOpen size={16} className="text-amber-500" /> Projects
        </h2>
        <button
          type="button"
          onClick={handleNewClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-700 bg-zinc-800 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          title="Start a new blank project"
        >
          <Plus size={14} /> New
        </button>
      </div>

      {confirmingNew && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-100">Start a blank project? Save this timeline first if you want to keep it.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmNewProject}
              className="flex-1 rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-500 transition-colors"
            >
              Start Blank
            </button>
            <button
              type="button"
              onClick={() => setConfirmingNew(false)}
              className="flex-1 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <label className="block text-xs font-medium text-zinc-400" htmlFor="project-name">Project name</label>
        <div className="flex gap-2">
          <input
            id="project-name"
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder={suggestedName}
            className="min-w-0 flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded-md transition-colors flex items-center justify-center gap-1.5"
            title="Save current project"
          >
            <Save size={15} /> Save
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="text-xs text-zinc-500 leading-relaxed rounded-lg border border-dashed border-zinc-800 p-3 bg-zinc-950/40">
          No saved projects yet. Save this timeline to keep it in your browser history.
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {projects.map(project => {
            const active = project.id === currentProjectId;
            const sceneCount = project.snapshot.scenes.length;
            return (
              <article
                key={project.id}
                className={`rounded-lg border p-3 transition-colors ${active ? 'border-amber-500/50 bg-amber-500/10' : 'border-zinc-800 bg-zinc-950/50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white" title={project.name}>{project.name}</h3>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'} · {project.snapshot.startYear}–{project.snapshot.endYear} · {formatUpdatedAt(project.updatedAt)}
                    </p>
                  </div>
                  {active && <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">Active</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onLoad(project)}
                    className="flex-1 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
                    title={`Load ${project.name}`}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(project)}
                    className="rounded-md border border-red-900/50 bg-red-950/30 px-2.5 py-1.5 text-red-300 hover:bg-red-950/60 transition-colors"
                    title={`Delete ${project.name}`}
                    aria-label={`Delete ${project.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
