

### 🗂️ Intro to Logiverse

> “Let me walk you through how to use **Logiverse**, a VSCode extension that helps developers organize and contextualize their `console.log` outputs more effectively.”

---

### 🔁 Log Timeline View

> “When Logiverse first opens, it presents the log outputs in **temporal order**—the same sequence they appeared during program execution. You’ll see log messages printed by the server as the application runs.”

---

### 🌳 Function Tree (Top of the View)

> “At the top of the panel, you’ll see a tree view showing a simplified call graph of your program. But to reduce clutter, Logiverse only includes functions that actually contain console.log statements. This helps you focus only on the parts of the code that generated output.”

> “Each tree node represents a function that logged something during runtime. You can click on a node to expand it and inspect the logs or subsequent function calls inside.”

---

### ✋ Drag & Drop to Create Custom Views

> “You can **drag** any function or log statement to the **top of the list** to create a new list. This isolates all logs associated with that function or that specific log statement. It’s a quick way to focus on just one part of the code or isolate a specific execution path.”
![Demo](./figures/call-graph.gif)

---

### 🔖 Labels and Filtering

> “Each log message is tagged with a **label**, typically the function name and call index.  
Clicking on a label will **filter the logs** to show only those related to that specific function call.”

> “For example, if you want to focus on the first call to `anonymous_function_15`, the one that received `Order 001`, you can click on its label.  
Logiverse will then split out the logs for just that function call—making it much easier to follow what happened in that call from start to finish.”
![Demo](./figures/execution-label.gif)
