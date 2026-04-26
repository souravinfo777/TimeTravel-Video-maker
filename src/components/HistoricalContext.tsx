import React from 'react';
import { HistoricalFact, WeatherData } from '../types';
import { BookOpen, Thermometer, CloudRain, Loader2, Sun, Cloud, CloudSnow, CloudLightning, CloudDrizzle, CloudFog } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoricalContextProps {
  facts: HistoricalFact[];
  weatherData: WeatherData[];
  isLoadingFacts: boolean;
  isLoadingWeather: boolean;
  locationName?: string;
}

function WeatherIcon({ condition }: { condition: string }) {
  const size = 14;
  switch (condition) {
    case 'Clear': return <Sun size={size} className="text-yellow-400" />;
    case 'Cloudy': return <Cloud size={size} className="text-zinc-400" />;
    case 'Rain':
    case 'Showers': return <CloudRain size={size} className="text-blue-400" />;
    case 'Drizzle': return <CloudDrizzle size={size} className="text-blue-300" />;
    case 'Snow': return <CloudSnow size={size} className="text-white" />;
    case 'Thunderstorm':
    case 'Stormy': return <CloudLightning size={size} className="text-yellow-300" />;
    case 'Foggy': return <CloudFog size={size} className="text-zinc-300" />;
    default: return <Cloud size={size} className="text-zinc-400" />;
  }
}

export function HistoricalContext({ facts, weatherData, isLoadingFacts, isLoadingWeather, locationName }: HistoricalContextProps) {
  const hasContent = facts.length > 0 || weatherData.length > 0 || isLoadingFacts || isLoadingWeather;
  if (!hasContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 space-y-4"
    >
      {(isLoadingWeather || weatherData.length > 0) && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
            <Thermometer size={14} className="text-blue-400" /> Historical Weather {locationName ? `· ${locationName.split(',')[0]}` : ''}
          </h3>
          {isLoadingWeather ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
              <Loader2 size={14} className="animate-spin" /> Loading weather data...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {weatherData.map(w => (
                <div key={w.year} className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
                  <div className="text-amber-400 font-mono font-bold text-sm mb-1">{w.year}</div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <WeatherIcon condition={w.dominantCondition} />
                    <span className="text-[11px] text-zinc-400">{w.dominantCondition}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Avg</span>
                      <span className="text-zinc-300">{w.avgTemp}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Range</span>
                      <span className="text-zinc-300">{w.minTemp}° – {w.maxTemp}°</span>
                    </div>
                    <div className="flex items-center gap-1 justify-between">
                      <CloudRain size={10} className="text-blue-400" />
                      <span className="text-zinc-300">{w.totalPrecipitation}mm</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(isLoadingFacts || facts.length > 0) && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
            <BookOpen size={14} className="text-purple-400" /> Historical Context {locationName ? `· ${locationName.split(',')[0]}` : ''}
          </h3>
          {isLoadingFacts ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
              <Loader2 size={14} className="animate-spin" /> Loading historical facts...
            </div>
          ) : (
            <div className="space-y-3">
              {facts.map((fact, i) => (
                <div key={i} className="flex gap-3 p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
                  {fact.thumbnail && (
                    <img src={fact.thumbnail} alt="" className="w-16 h-16 object-cover rounded-md shrink-0 border border-zinc-800" />
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{fact.title}</h4>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-3 leading-relaxed">{fact.extract}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
