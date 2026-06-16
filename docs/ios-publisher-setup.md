# iOS Publisher Setup Guide

Two people are involved in this setup:

- **Publisher** — holds the Apple Developer account. Does everything in this guide up to the "Handoff" section, then sends a package of files to the developer. Needs no GitHub or Firebase access.
- **Developer** — takes the publisher's files and configures Firebase and GitHub. Does the "Developer Setup" section.

---

## PART A — Publisher (Apple only)

You need: a Mac with Xcode installed, and an active Apple Developer Program membership.

### Step 1 — Note your IDs

You'll need these numbers later. Find them now and keep them somewhere.

| ID | Where to find it |
|----|-----------------|
| **Team ID** | [developer.apple.com](https://developer.apple.com) → top-right corner → Account → shows `XXXXXXXXXX` under your name |
| **App Store Connect Team ID** | [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → click your name top-right → if you have one team, it's the same as your Team ID above |
| **Apple ID email** | Your login email for developer.apple.com |

---

### Step 2 — Register the App ID

1. [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles** → **Identifiers** → **+**
2. Select **App IDs** → **App** → Continue
3. Fill in:
   - **Description:** `Escronet`
   - **Bundle ID:** Explicit → `com.escronet.app`
4. Scroll down, enable ✅ **Push Notifications**
5. Continue → **Register**

---

### Step 3 — Create the APNs Auth Key

Firebase uses this to deliver push notifications to iPhones.

1. Left sidebar → **Keys** → **+**
2. **Key Name:** `Escronet APNs`
3. Check ✅ **Apple Push Notifications service (APNs)**
4. Continue → **Register**
5. **Download** the `.p8` file → rename it `APNs_Key.p8` → save it
6. On this screen, copy the **Key ID** (10-character string) → save it

---

### Step 4 — Create the Distribution Certificate

This certificate signs the app binary for App Store distribution.

**4a — Generate a certificate request on your Mac:**

Open **Keychain Access** (search in Spotlight) →
Menu bar: **Keychain Access** → **Certificate Assistant** → **Request a Certificate from a Certificate Authority...**

Fill in:
- **User Email Address:** your Apple ID email
- **Common Name:** `Escronet Distribution`
- **CA Email Address:** leave blank
- Select **Saved to disk** → Continue
- Save the file as `CertificateSigningRequest.certSigningRequest`

**4b — Submit to Apple:**

1. Back in [developer.apple.com](https://developer.apple.com) → **Certificates** → **+**
2. Select **Apple Distribution** → Continue
3. Upload the `CertificateSigningRequest.certSigningRequest` file → Continue
4. **Download** the certificate → it's named something like `distribution.cer`
5. Double-click `distribution.cer` to install it into Keychain Access

**4c — Export as .p12:**

1. Open **Keychain Access** → search for `Apple Distribution`
2. Find the entry named `Apple Distribution: [Your Name] (XXXXXXXXXX)`
3. Right-click it → **Export "Apple Distribution:..."**
4. Save as `distribution.p12`
5. Set a password — write it down, the developer needs it
6. Click OK to export

---

### Step 5 — Create the App Store Provisioning Profile

1. [developer.apple.com](https://developer.apple.com) → **Profiles** → **+**
2. Under **Distribution** select **App Store Connect** → Continue
3. **App ID:** select `com.escronet.app` → Continue
4. **Certificate:** select the `Apple Distribution` certificate you just created → Continue
5. **Profile Name:** `Escronet App Store` → Generate
6. **Download** → saves as `Escronet_App_Store.mobileprovision`

---

### Step 6 — Create the Escronet App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **My Apps** → **+** → **New App**
3. Fill in:
   - **Platforms:** iOS
   - **Name:** `Escronet`
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** select `com.escronet.app`
   - **SKU:** `escronet-ios`
4. **Create**

---

### Step 7 — Create the App Store Connect API Key

GitHub Actions uses this key to upload builds — it avoids passwords and 2FA entirely.

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Users and Access** → **Integrations** tab → **App Store Connect API**
2. Click **Generate API Key** (or **+**)
3. **Name:** `Escronet CI` — **Access:** `App Manager`
4. **Generate**
5. **Download API Key** → rename it `AppStoreConnect_Key.p8` → save it
6. On this page, copy and save:
   - **Key ID** (10-character string next to the key name)
   - **Issuer ID** (UUID at the top of the keys list)

---

### Step 8 — Set Up TestFlight

1. In App Store Connect → **Escronet** → **TestFlight** tab
2. Left sidebar → **Internal Testing** → click the default group (or **+** to create one named `Internal`)
3. **+** to add testers — add yourself and anyone else who should receive builds
4. Enable **Automatic Distribution** so new builds arrive automatically

---

### Handoff — Send These to the Developer

Zip up the following files and send them securely (Signal, AirDrop, or an encrypted message):

| File | Created in step |
|------|----------------|
| `APNs_Key.p8` | Step 3 |
| `distribution.p12` | Step 4c |
| `AppStoreConnect_Key.p8` | Step 7 |
| `Escronet_App_Store.mobileprovision` | Step 5 |

Also send these values in a message:

```
APNs Key ID:               (10-char, from step 3)
Apple Team ID:             (10-char, from step 1)
App Store Connect Key ID:  (10-char, from step 7)
App Store Connect Issuer ID: (UUID, from step 7)
distribution.p12 password: (the password you set in step 4c)
Apple ID email:            (your Apple ID email)
App Store Connect Team ID: (from step 1, same as Team ID if single team)
```

That's everything. You're done.

---
---

## PART B — Developer Setup

You need: the zip from the publisher, a Firebase account for the Escronet project, and admin access to the GitHub repository.

---

### Step 1 — Firebase: Register the iOS App

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → open the **Escronet** project
2. **Project Settings** (gear icon) → **General** → **Your apps** → **Add app** → iOS icon
3. Fill in:
   - **Apple bundle ID:** `com.escronet.app`
   - **App nickname:** `Escronet iOS`
4. **Register app**
5. **Download `GoogleService-Info.plist`** → save it
6. Click through the remaining steps (SDK is already integrated)

### Step 2 — Firebase: Upload the APNs Key

1. **Project Settings** → **Cloud Messaging** tab
2. Scroll to **Apple app configuration** → find the `com.escronet.app` row
3. Under **APNs Authentication Key** → **Upload**
4. Upload the publisher's `APNs_Key.p8` file
5. Enter the **APNs Key ID** and **Team ID** the publisher sent
6. **Upload**

---

### Step 3 — Add GitHub Repository Secrets

Go to the GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Run these commands in Terminal to encode each file, then paste the output as the secret value:

```bash
# Encode each file to base64 — output goes to your clipboard
base64 -i ~/path/to/distribution.p12 | pbcopy
base64 -i ~/path/to/AppStoreConnect_Key.p8 | pbcopy
base64 -i ~/path/to/Escronet_App_Store.mobileprovision | pbcopy
base64 -i ~/path/to/GoogleService-Info.plist | pbcopy
```

Add all of these secrets:

| Secret name | Value |
|---|---|
| `DISTRIBUTION_CERT_P12` | `base64 -i distribution.p12 \| pbcopy` |
| `DISTRIBUTION_CERT_PASSWORD` | The `.p12` password the publisher set in step 4c |
| `PROVISIONING_PROFILE` | `base64 -i Escronet_App_Store.mobileprovision \| pbcopy` |
| `KEYCHAIN_PASSWORD` | Any random string — used only inside the CI runner (e.g. `openssl rand -hex 16`) |
| `APP_STORE_CONNECT_API_KEY_ID` | Key ID from the publisher (step 7) |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Issuer ID from the publisher (step 7) |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | `base64 -i AppStoreConnect_Key.p8 \| pbcopy` |
| `GOOGLE_SERVICE_INFO_PLIST` | `base64 -i GoogleService-Info.plist \| pbcopy` |

Also add these as **Variables** (not secrets — same Settings page, **Variables** tab):

| Variable name | Value |
|---|---|
| `APPLE_TEAM_ID` | Team ID from the publisher |
| `ITC_TEAM_ID` | App Store Connect Team ID from the publisher |
| `APPLE_ID` | Publisher's Apple ID email |

---

### Step 4 — Verify

Push any small change to `main`. Watch the **TestFlight** workflow at:
`github.com/yourorg/escronet/actions`

The build takes 15–20 minutes. When it finishes, the publisher receives an email from Apple and the build appears in TestFlight.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "No signing certificate found" | Re-export `distribution.p12` from publisher's Mac, update the `DISTRIBUTION_CERT_P12` secret |
| "Profile doesn't match certificate" | Publisher needs to re-download the provisioning profile after the cert was exported |
| "Invalid API key" | Re-check `APP_STORE_CONNECT_API_KEY_ID`, `ISSUER_ID`, and `KEY_CONTENT` secrets |
| Push notifications not working | Redo Firebase step 2 (APNs key upload) |
| Build uploads but no TestFlight build | Apple processing takes up to 30 min — wait and refresh |
