declare module 'argon2-wasm' {
  type Argon2Type = 0 | 1 | 2; // Argon2d | Argon2i | Argon2id

  interface Argon2Options {
    pass: string | Uint8Array;
    salt: string | Uint8Array;
    time?: number;
    mem?: number;
    parallelism?: number;
    hashLen?: number;
    type?: Argon2Type;
  }

  interface Argon2Instance {
    hash: (options: Argon2Options) => Promise<Uint8Array>;
  }

  function initArgon2(): Promise<Argon2Instance>;

  export default initArgon2;
}
