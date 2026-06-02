import { create } from "zustand";
import { CardType, Rarity } from "@/atomic";
import type { ICard, ISkill } from "@/atomic";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptySkill(): ISkill {
  const now = Date.now();
  return {
    id: generateId("skill"),
    version: "1.0",
    createdAt: now,
    updatedAt: now,
    name: "新技能",
    description: "",
    conditions: [],
    costs: [],
    effects: [],
    cooldown: 0,
    useLimit: 0,
    isPassive: false
  };
}

function createDefaultCard(type: CardType): ICard {
  const now = Date.now();
  const base: ICard = {
    id: generateId("card"),
    version: "1.0",
    createdAt: now,
    updatedAt: now,
    name: "",
    displayName: "",
    type,
    rarity: Rarity.WHITE,
    skills: [],
    tags: [],
    mutuallyExclusive: [],
    baseStats: {},
    maxCount: 2,
    priority: 80,
    description: "",
    flavorText: ""
  };

  if (type === CardType.BASIC) {
    base.skills.push(createEmptySkill());
  }

  return base;
}

interface CardStore {
  currentCard: ICard | null;
  currentStep: number;

  setCardType: (type: CardType) => void;
  updateBasicInfo: (info: Partial<ICard>) => void;
  addSkill: (skill: ISkill) => void;
  removeSkill: (skillId: string) => void;
  updateSkill: (skillId: string, skill: Partial<ISkill>) => void;
  updateAllSkills: (skills: ISkill[]) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetCard: () => void;
  getCardData: () => ICard | null;
}

const useCardStore = create<CardStore>((set, get) => ({
  currentCard: null,
  currentStep: 0,

  setCardType: (type: CardType) => {
    set({ currentCard: createDefaultCard(type), currentStep: 1 });
  },

  updateBasicInfo: (info: Partial<ICard>) => {
    set((state) => {
      if (!state.currentCard) return state;
      return {
        currentCard: { ...state.currentCard, ...info, updatedAt: Date.now() }
      };
    });
  },

  addSkill: (skill: ISkill) => {
    set((state) => {
      if (!state.currentCard) return state;
      return {
        currentCard: {
          ...state.currentCard,
          skills: [...state.currentCard.skills, skill],
          updatedAt: Date.now()
        }
      };
    });
  },

  removeSkill: (skillId: string) => {
    set((state) => {
      if (!state.currentCard) return state;
      return {
        currentCard: {
          ...state.currentCard,
          skills: state.currentCard.skills.filter((s) => s.id !== skillId),
          updatedAt: Date.now()
        }
      };
    });
  },

  updateSkill: (skillId: string, partial: Partial<ISkill>) => {
    set((state) => {
      if (!state.currentCard) return state;
      return {
        currentCard: {
          ...state.currentCard,
          skills: state.currentCard.skills.map((s) =>
            s.id === skillId ? { ...s, ...partial, updatedAt: Date.now() } : s
          ),
          updatedAt: Date.now()
        }
      };
    });
  },

  updateAllSkills: (skills: ISkill[]) => {
    set((state) => {
      if (!state.currentCard) return state;
      return {
        currentCard: {
          ...state.currentCard,
          skills: skills.map((s) => ({ ...s, updatedAt: Date.now() })),
          updatedAt: Date.now()
        }
      };
    });
  },

  setStep: (step: number) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 4) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0) })),
  resetCard: () => set({ currentCard: null, currentStep: 0 }),
  getCardData: (): ICard | null => get().currentCard
}));

export { useCardStore };
export type { CardStore };
