import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roomAPI } from "../api/roomAPI";

export function useHomeData() {
  return useQuery({
    queryKey: ["home-data"],
    queryFn: async () => (await roomAPI.getHome()).data,
  });
}

export function useRooms(params = {}) {
  return useQuery({
    queryKey: ["rooms", params],
    queryFn: () => roomAPI.getRooms(params),
  });
}

export function useRoomDetail(id, params = {}) {
  return useQuery({
    queryKey: ["room-detail", id, params],
    queryFn: async () => (await roomAPI.getRoom(id, params)).data,
    enabled: Boolean(id),
  });
}

export function useSavedRooms() {
  return useQuery({
    queryKey: ["saved-rooms"],
    queryFn: () => roomAPI.getSavedRooms(),
  });
}

export function useSaveRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId) => roomAPI.saveRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-rooms"] });
    },
  });
}

export function useRemoveSavedRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId) => roomAPI.removeSavedRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-rooms"] });
    },
  });
}
