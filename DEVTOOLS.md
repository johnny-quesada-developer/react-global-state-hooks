# 🛠️ DevTools Extension

**Debug like a pro!** Our browser extension gives you superpowers! 🦸‍♂️

## 🔗 [Install for Chrome](https://chromewebstore.google.com/detail/bafojplmkpejhglhjpibpdhoblickpee/preview?hl=en&authuser=0)

## ✨ Features

<table>
<tr>
<td width="50%">

#### 📊 **State Inspector**

View all global states and contexts in real-time

</td>
<td width="50%">

#### ⏱️ **Time Travel**

Rewind and replay state changes

</td>
</tr>
<tr>
<td width="50%">

#### ✏️ **Live Editing**

Modify state directly from DevTools

</td>
<td width="50%">

#### 🎬 **Action Tracking**

See every action that changes state

</td>
</tr>
</table>

## 💻 Terminal (`rgsh`)

The state libraries install an `rgsh` command that talks to the panel: watch actions, read state and, if you allow it, run actions or change state from a terminal.

```bash
npm i -D ws
npx rgsh --list
npx rgsh --help
```

## 📸 Screenshots

| Track State Changes                                                                                                                       | Modify State                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ![Track State Changes](https://raw.githubusercontent.com/johnny-quesada-developer/react-global-state-hooks/main/public/track-state-changes.png) | ![Modify State](https://raw.githubusercontent.com/johnny-quesada-developer/react-global-state-hooks/main/public/modify-the-state.png) |

| Restore State                                                                                                                     | Action Granularity                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| ![Restore State](https://raw.githubusercontent.com/johnny-quesada-developer/react-global-state-hooks/main/public/restore-the-state.png) | ![Action Granularity](https://raw.githubusercontent.com/johnny-quesada-developer/react-global-state-hooks/main/public/custom-actions-granularity.png) |
