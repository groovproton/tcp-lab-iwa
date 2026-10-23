# Architecture & decisions

## Phase 1

```
Signed Web Bundle (.swbn)
  └── Isolated Web App
       ├── Diagnostics: TCPSocket, UDPSocket, isolation
       └── User-initiated TCP connect / close
                    │
                    └──── Direct Sockets API → example.com:80
```

- No server **during installed app operation**.
- Signing/build tooling runs only when publishing a new bundle.
- IWA and Chrome extension are different application types. This prototype proves IWA capability, **not direct socket access from a normal extension**.
- Direct Sockets has security permissions, platform constraints and browser-specific behavior. A visible install UI does not guarantee successful connection.
- No credentials; no raw MongoDB port until successful Stage 1 test.

## Possible Phase 2 (NOT authorized to implement)
Direct TCP/TLS → MongoDB Wire Protocol `hello` → BSON → authentication → selected vocabulary commands. Revisit Atlas host discovery, SRV, TLS, ACL and IWA/extension communication only after validated TCP.

## Quality
- Show exact error name/message.
- No auto-connect and no silent traffic.
- UI test settings are user-supplied; never persist secrets.
- Limit test duration and close cleanly.
