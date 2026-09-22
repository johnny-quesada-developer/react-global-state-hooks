# 🛠️ DevTools Extension

Inspect state, trace actions and reproduce bugs from your browser or terminal.

## 🔗 [Install for Chrome](https://chromewebstore.google.com/detail/bafojplmkpejhglhjpibpdhoblickpee)

## ✨ Features

<table>
<tr>
<td width="50%">

#### 📊 **State Inspector**

View all global states and contexts in real-time

</td>
<td width="50%">

#### ⏱️ **Time Travel**

Restore a recorded state and inspect the result

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

The state libraries install an `rgsh` command that talks to the panel: watch actions, read state, and run actions or change state from a terminal.

```bash
npm i -D ws
npx rgsh --list
npx rgsh --help
```

## 📸 Screenshots

| Track State Changes                                                                                                                       | Modify State                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ![Track State Changes](https://raw.githubusercontent.com/johnny-quesada-developer/react-global-state-hooks/master/public/track-state-changes.png) | ![Modify State](https://raw.githubusercontent.com/johnny-quesada-developer/react-global-state-hooks/master/public/modify-the-state.png) |

| Restore State                                                                                                                     | Action Granularity                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| ![Restore State](https://raw.githubusercontent.com/johnny-quesada-developer/react-global-state-hooks/master/public/restore-the-state.png) | ![Action Granularity](https://raw.githubusercontent.com/johnny-quesada-developer/react-global-state-hooks/master/public/custom-actions-granularity.png) |
