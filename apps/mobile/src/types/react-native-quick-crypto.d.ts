declare module "react-native-quick-crypto" {
  import { BinaryLike } from "crypto";

  export type HashEncoding = "hex" | "base64" | "latin1";

  export interface Hash {
    update(data: BinaryLike): Hash;
    digest(encoding: HashEncoding): string;
  }

  export function createHash(algorithm: string): Hash;
}
