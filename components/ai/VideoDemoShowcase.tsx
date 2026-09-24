"use me";
import React, { useState } from "react";

export interface VideoDemoProps {
  title?: string;
  description?: string;
  videoUrl?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
}

/**
 * VideoDemoShowcase Component
 * Interactive video showcase banner for PR walk-throughs and automated demo playback.
 */
export const VideoDemoShowcase: React.FC<VideoDemoProps> = ({
  title = "NexusOS AI Feature Walkthrough",
  description = "Assista à demonstração em vídeo gerada automaticamente a partir das alterações do Pull Request.",
  videoUrl,
  aspectRatio = "16:9",
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="w-full max-w-4xl mx-auto my-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 shadow-2xl overflow-hidden p-6 text-white">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            PR Video Highlight
          </div>
          <h3 className="text-xl font-bold tracking-tight text-slate-100">{title}</h3>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-medium text-sm shadow-lg shadow-indigo-500/25 cursor-pointer"
        >
          {isPlaying ? "Pausar Vídeo" : "Assistir Vídeo"}
        </button>
      </div>

      <div className={`relative w-full aspect-${aspectRatio === "16:9" ? "video" : "square"} rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center overflow-hidden`}>
        {videoUrl && isPlaying ? (
          <video src={videoUrl} controls autoPlay className="w-full h-full object-cover rounded-xl" />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-slate-300 font-medium text-base">Vídeo de Apresentação do PR</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Gere narrações e vídeos automáticos do seu código utilizando o comando /pr-to-video.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
