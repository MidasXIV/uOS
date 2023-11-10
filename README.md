# uos – uOS.

### A personal logging and tracking CLI.

A straightforward command-line interface for logging anything about your day and reviewing it later.

![](./preview.png)

## Inspiration

* [UdaraJay/atm](https://github.com/UdaraJay/atm]: commandline logging.
* UdaraJay/uOS: My personal AI and home operating system

## How it works

**uos** is simple. It writes logs into a `uos_log` folder in your user directory. One log file per day (`dd-mm-yyyy.txt`). One line per log in each file. All of it's stored locally, you can back them up, and use them however you like.

## Installation

```sh-session
$ npm install -g @midasxiv/uos
```

## Local installation

1. **Clone the Repository:**
   - Clone the repository of your Node.js application to your local machine using Git:
     ```bash
     git clone https://github.com/MidasXIV/uOS.git
     cd uOS
     ```

2. **Install Dependencies:**
   - Navigate to the root directory of your application.
   - Run `npm install` to install the project dependencies.

3. **Link the Package Globally:**
   - While still in the root directory, run the following command to link your package globally:
     ```bash
     npm link
     ```
     This command will create a symbolic link from the global `node_modules` directory to your local development directory.

4. **Make Changes Locally:**
   - Make any changes or modifications to your code in your local development directory.

5. **Test Locally:**
   - Run and test your application locally by using commands like:
     ```bash
     uos mood
     ```

6. **Re-Link as Needed:**
   - If you make changes to the code and want to test them globally, re-run `npm link` in your local directory to update the global link.

Remember, if you are frequently making changes and testing locally, it's a good practice to unlink the package globally (`npm unlink`) when you are done with development and before publishing updates. This ensures that you are using the published version when installed globally.

## How to use uos

Once your have `uos` installe on your computer you should be able to run `uos` commands from your terminal.

### `uos log`

For logging things in general.

Accepts a `-m` flag for the `message` and an optional `-t` flag for `type`. Type can be absolutely anything you want, but there are some types that `uos` can understand and review for you when you use the review command.

Example:

```sh-session
$ uos log -m "Good morning"
👏 Logged to /Users/user/uos_logs/27-08-2020.txt

$ uos log -m "Published first version of uos" -t done
👏 Logged to /Users/user/uos_logs/27-08-2020.txt

$ uos log -m smoothie -t drank
👏 Logged to /Users/user/uos_logs/27-08-2020.txt
```

### `uos mood`

For mood tracking.

Run the command `uos mood` and follow the prompts.

```sh-session
$ uos mood
? Name the feeling? (Pick the first you relate to uos) Happy/Aliveness
? What caused this feeling? something
? Behaviors or actions this feeling caused me to take? nothing
? Is this feeling appropriate to the situation? why not
? What can I do to improve/fix it? (Remember to be kind to yourself) why fix
👏 Logged to /Users/user/uos_logs/13-09-2020.txt
```

### `uos decision`

Decision journal.

Run the command `uos decision` and follow the prompts.

```sh-session
$ uos decision
? The decision you made: Updating uos logs
? Mental/Physical state: Focused
? Situation/Context: stream coding
? The problem statement or frame: stream coding
👏 Logged to /Users/user/uos_logs/13-09-2020.txt
```

### `uos review`

View your logs.

- `uos review` // Day
- `uos review week`
- `uos review month`

OPTIONS
-x, --extended show extra columns
--columns=columns only show provided columns (comma-seperated)
--csv output is csv format
--filter=filter filter property by partial string matching, ex: name=foo
--no-header hide table header from output
--no-truncate do not truncate output to fit screen
--sort=sort

```sh-session
$ uos review
Summary of all logs
┌─────────┬────────┐
│ (index) │ Values │
├─────────┼────────┤
│   log   │   7    │
│  done   │   3    │
│  mood   │   2    │
│  quote  │   1    │
└─────────┴────────┘
Mood(s) in timespan
┌─────────┬────────┐
│ (index) │ Values │
├─────────┼────────┤
│ Happy   │   3    │
│ Anxious │   1    │
└─────────┴────────┘

Time   Type     Message
13:45  mood     Unsettled/Doubt
16:15  mood     Accepting/Content
16:27  mood     Hopeful
16:34  quote    lorem ipsum
16:52  decision added a decision journal to uos
17:03  mood     Happy/Aliveness
17:05  decision Updating uos logs
```
