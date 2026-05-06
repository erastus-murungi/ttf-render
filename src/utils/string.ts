export const uint32ToTag = (value: number): string => {
  return String.fromCharCode(
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  );
};
