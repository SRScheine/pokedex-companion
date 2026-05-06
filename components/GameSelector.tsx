'use client';

import {useState, useEffect} from 'react';
import {getGenerations, getVersionGroupsForGeneration} from '@/lib/api';

interface Generation {
  id: number;
  name: string;
}

interface VersionGroup {
  name: string;
  displayName: string;
}

interface GameSelectorProps {
  onGameChange: (versionGroupName: string) => void;
}

const DEFAULT_GEN = 7;

const GameSelector = ({onGameChange}: GameSelectorProps) => {
  const [versionGroup, setVersionGroup] = useState<string>('lets-go-pikachu-lets-go-eevee');
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedGen, setSelectedGen] = useState<number>(DEFAULT_GEN);
  const [versionGroups, setVersionGroups] = useState<VersionGroup[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const gens = await getGenerations();
        setGenerations(gens);
        await fetchVersionGroups(DEFAULT_GEN);
      } catch (error) {
        console.error('Failed to fetch generations:', error);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchVersionGroups = async (genId: number) => {
    try {
      const groups = await getVersionGroupsForGeneration(genId);
      setVersionGroups(groups);
      const defaultGroup = groups[groups.length - 1]?.name ?? groups[0]?.name;
      if (defaultGroup) {
        setVersionGroup(defaultGroup);
        onGameChange(defaultGroup);
      }
    } catch (error) {
      console.error('Failed to fetch version groups:', error);
    }
  };

  const handleGenChange = (genId: number) => {
    setSelectedGen(genId);
    fetchVersionGroups(genId);
  };

  const handleVersionGroupChange = (vgName: string) => {
    setVersionGroup(vgName);
    onGameChange(vgName);
  };

  return (
    <div className="border-pokemon-lightgray mb-6 border-b pb-6">
      <div className="mb-3">
        <p className="text-pokemon-gray mb-2 text-xs font-medium tracking-wide uppercase">Generation</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {generations.map((gen) => (
            <button
              key={gen.id}
              onClick={() => handleGenChange(gen.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedGen === gen.id
                  ? 'bg-pokemon-red text-white'
                  : 'bg-pokemon-lightgray text-pokemon-black hover:bg-gray-300'
              }`}
            >
              Gen {gen.id}
            </button>
          ))}
        </div>
      </div>

      {versionGroups.length > 0 && (
        <div>
          <p className="text-pokemon-gray mb-2 text-xs font-medium tracking-wide uppercase">Game</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {versionGroups.map((vg) => (
              <button
                key={vg.name}
                onClick={() => handleVersionGroupChange(vg.name)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  versionGroup === vg.name
                    ? 'bg-pokemon-red text-white'
                    : 'bg-pokemon-lightgray text-pokemon-black hover:bg-gray-300'
                }`}
              >
                {vg.displayName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameSelector;
