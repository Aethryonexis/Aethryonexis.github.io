# Offline contact-form cryptography

The website encrypts every inquiry in the visitor's browser with the public key. Each
message gets a fresh AES-256-GCM key, and that one-time key is wrapped with RSA-OAEP
SHA-256. Only the holder of the matching private key can recover the message. The relay,
GitHub, and the network only ever see ciphertext; the private key is never published.

## Setup and use

1. Double-click `keygen.html`, then select **Generate keypair**.
2. Copy the public JWK and paste it into `CONFIG.publicKeyJwk` in `../app.js`.
3. Download `private-key.jwk` and store it somewhere safe and offline. It is git-ignored
   and must never be committed or pushed.
4. To read an inquiry, double-click `decrypt.html`, load `private-key.jwk` (or paste its
   contents), paste the encrypted blob from the email, then select **Decrypt**.

## Security notes

- The private key is handled only in local browser memory and never leaves your machine.
- Rotate keys by generating a new pair and updating `CONFIG.publicKeyJwk`. Old blobs become
  unreadable if you do not retain the old private key.
- Both tools are fully offline, self-contained, and work directly from `file://`; no server,
  dependency, or network connection is needed.
