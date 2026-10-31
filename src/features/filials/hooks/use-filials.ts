"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsBoolean, parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";

import { useAllFilialsQuery } from "@/shared/hooks/use-scope";
import { metaKeys } from "@/shared/meta/use-meta-query";

import {
  appointHead,
  createFilial,
  loadAudit,
  loadCatalog,
  loadPerformance,
  loadSeats,
  loadStructure,
  replaceHead,
  resetHeadPassword,
  revokeHead,
  setMainFilial,
  setRolePermissions,
  updateFilial,
  updateHead,
} from "../api/filials.api";
import { withRolePermissions } from "../model/filials.rules";
import { LEADER_ROLES, type LeaderRole, type Structure } from "../model/filials.schema";

export const filialKeys = {
  all: ["filials"] as const,
  structure: () => [...filialKeys.all, "structure"] as const,
  audit: () => [...filialKeys.all, "audit"] as const,
  catalog: () => [...filialKeys.all, "catalog"] as const,
  seats: (filialId: number, q: string) => [...filialKeys.all, "seats", filialId, q] as const,
  performance: (scope: readonly string[]) => [...filialKeys.all, "performance", ...scope] as const,
};

const STRUCTURE_STALE_MS = 5 * 60_000;

export const useStructureQuery = () =>
  useQuery({ queryKey: filialKeys.structure(), queryFn: loadStructure, staleTime: STRUCTURE_STALE_MS });

export const useAuditQuery = () => useQuery({ queryKey: filialKeys.audit(), queryFn: loadAudit });

export const useCatalogQuery = () =>
  useQuery({ queryKey: filialKeys.catalog(), queryFn: loadCatalog, staleTime: STRUCTURE_STALE_MS });

/** Filialdagi o'rinlar qidiruvi (B-5) — yozayotganda oldingi natija turadi. */
export const useSeatsQuery = (filialId: number, q: string) =>
  useQuery({
    queryKey: filialKeys.seats(filialId, q.trim()),
    queryFn: () => loadSeats(filialId, q),
    placeholderData: keepPreviousData,
  });

/** Har filial kartasi o'z natijasini ko'rsatadi — filial filtri bu ro'yxatni toraytirmaydi (faqat davr). */
export const usePerformanceQuery = () => {
  const { params, key, options } = useAllFilialsQuery();
  return useQuery({
    queryKey: filialKeys.performance(key),
    queryFn: () => loadPerformance(params),
    ...options,
  });
};

/**
 * Har yozuvchi amaldan keyin tuzilma, audit va meta (filtrdagi filiallar) qayta so'raladi; filial
 * nomi boshqa bo'limlarda ham ko'rinadi — ular eskirgan deb belgilanadi.
 */
const useStructureMutation = <Input, Output>(mutationFn: (input: Input) => Promise<Output>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: filialKeys.structure() });
      void queryClient.invalidateQueries({ queryKey: filialKeys.audit() });
      void queryClient.invalidateQueries({ queryKey: metaKeys.all });
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] !== filialKeys.all[0] && query.queryKey[0] !== metaKeys.all[0],
        refetchType: "none",
      });
    },
  });
};

export const useCreateFilial = () => useStructureMutation(createFilial);
export const useUpdateFilial = () => useStructureMutation(updateFilial);
export const useSetMainFilial = () => useStructureMutation(setMainFilial);
export const useAppointHead = () => useStructureMutation(appointHead);
export const useRevokeHead = () => useStructureMutation(revokeHead);
/**
 * Dopusklar saqlangach kartadagi soni darhol yangilanadi: javobdagi rol tuzilma keshiga yoziladi,
 * keyin tuzilma baribir qayta so'raladi.
 */
export const useSetRolePermissions = () => {
  const queryClient = useQueryClient();
  const mutation = useStructureMutation(setRolePermissions);
  return {
    ...mutation,
    mutate: (...[input, options]: Parameters<typeof mutation.mutate>) =>
      mutation.mutate(input, {
        ...options,
        onSuccess: (role, ...rest) => {
          queryClient.setQueryData<Structure>(filialKeys.structure(), (current) =>
            current ? withRolePermissions(current, role) : current,
          );
          options?.onSuccess?.(role, ...rest);
        },
      }),
  };
};
export const useUpdateHead = () => useStructureMutation(updateHead);
export const useResetHeadPassword = () => useStructureMutation(resetHeadPassword);
export const useReplaceHead = () => useStructureMutation(replaceHead);

/**
 * Ochiq oynalar URL da: `?create=1` / `?edit=2` — filial formasi; `?leader=2&role=chief_logist` —
 * tayinlash yoki dopusklar; `?seat=2&role=chief_logist` — rahbar detal oynasi.
 */
export const useFilialDialogs = () => {
  const [state, setState] = useQueryStates({
    edit: parseAsInteger,
    create: parseAsBoolean,
    leader: parseAsInteger,
    seat: parseAsInteger,
    role: parseAsStringLiteral(LEADER_ROLES),
  });
  return {
    editId: state.edit,
    isCreating: state.create === true,
    leaderFilialId: state.leader,
    seatFilialId: state.seat,
    leaderRole: state.role,
    openCreate: () => void setState({ create: true, edit: null }),
    openEdit: (id: number) => void setState({ edit: id, create: null }),
    closeForm: () => void setState({ edit: null, create: null }),
    openLeader: (filialId: number, role: LeaderRole) => void setState({ leader: filialId, role, seat: null }),
    closeLeader: () => void setState({ leader: null, role: null }),
    openSeat: (filialId: number, role: LeaderRole) => void setState({ seat: filialId, role, leader: null }),
    closeSeat: () => void setState({ seat: null, role: null }),
  };
};
