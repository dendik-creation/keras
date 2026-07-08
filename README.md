# KeRaS

## Introduction

KeRaS is an open-source tool designed to help university students organize and submit their course schedules (KRS) with ease. If you often struggle with managing your class schedules, KeRaS provides a simple, drama-free solution to streamline the process.

### Key Features

- **Unified View:** See all available course schedules in a single, integrated dashboard. No more switching between pages—everything you need is right in front of you.
- **Perang Submit:** The system automatically and repeatedly submits your KRS selections at high speed to increase your chances of securing your desired classes. *Note: Success rate depends on the performance of your university's official system.*
- **Zero Database:** KeRaS does not store any of your personal data. All information is processed temporarily to ensure your privacy and security.
- **Realtime Scrapping:** Course schedule data is fetched in real-time from your university's official website, ensuring you always get the most accurate and up-to-date information.
- **Anonymous Analytics:** KeRaS collects anonymous usage statistics via [PostHog](https://posthog.com) to understand how the tool is used. Your NIM is always masked (e.g. `202451***`), no raw identity is ever sent, and no personal data is stored on our side.
- **Server-side Bridging:** Your session acts as a secure bridge between KeRaS and your university's KRS entry system.

## Todo
- [x] Create login architecture
- [x] Manage session to access university KRS system
- [x] Simple scheduling view for selecting courses
- [x] Implement "perang krs" feature for rapid submission
- [x] Ensure no data is stored permanently
- [x] Real-time data scraping from university website
- [x] Anonymous usage analytics via PostHog
- [ ] Responsive design for mobile devices
- [ ] Documentation and user guide

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/dendik-creation/keras.git
   ```
2. Install dependencies:
   ```bash
   bun install
   ```
3. Configure environment variables (see `.env.example`). For analytics, set:
   ```bash
   NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN="phc_xxx"   # PostHog project token
   NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
   ```
   Analytics is optional — if the key is empty, tracking is simply disabled.
4. Start the development server:
   ```bash
   bun run dev
   ```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/dendik-creation/keras/).

## Any Issues?
If you encounter any issues or have questions, please feel free to open an issue on the [GitHub repository](https://github.com/dendik-creation/keras/issues). Or contact me directly at [dendik_542](https://instagram.com/dendik_542).

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=dendik-creation/keras&type=date&legend=bottom-right&sealed_token=tpfOCWqhc65easbipnRaF5VAFFvfaCv9Fr0kVNZ6rGBS2ld98s0eocvSp3SvlMseZHju2aeeNDduvbdGlmfdlFVYCsOBlB4MH92YQ7Pc930mTD7renr7kUtP5qL806t-W62qf-N3d2XptcOaxVdUoWeWqbxzm1FxVHe5tkwlWliGaG8AkK5Vbpn5OSTj)](https://www.star-history.com/?repos=dendik-creation%2Fkeras&type=date&legend=bottom-right)
