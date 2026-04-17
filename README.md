# Myhill–Nerode DFA Minimization Simulator

An interactive web-based visualizer for DFA minimization using the Myhill–Nerode equivalence (table-filling method).

This project demonstrates how distinguishable state pairs are identified step-by-step and how equivalent states are merged to construct the minimized DFA.

---

## Features

* Triangular table visualization for distinguishability marking
* Step-by-step simulation of the table-filling algorithm
* Current step panel showing pair, symbol, and result
* Transition detail view for state transitions
* Insight panel explaining why pairs are distinguishable
* Auto play and manual step controls
* Speed control for simulation
* Equivalence class detection
* Minimized DFA construction
* Graph visualization of original and minimized DFA

---

## Concepts Covered

* Deterministic Finite Automata (DFA)
* DFA Minimization
* Myhill–Nerode Theorem
* State equivalence and distinguishability
* Table-filling method

---

## Tech Stack

* HTML
* CSS
* JavaScript
* Cytoscape.js (for graph visualization)

---

## How to Run

1. Clone the repository:
   git clone <your-repo-link>

2. Open the project folder

3. Open index.html in a web browser

No additional setup is required.

---

## Usage

1. Enter DFA states, alphabet, and transitions
2. Select start state and final states
3. Click "Initialize Simulator"
4. Use "Next Step" or "Auto Play" to run the simulation
5. Observe:

   * Table updates
   * Transition details
   * Insight panel explanations
6. View equivalence classes and minimized DFA

---

## Project Objective

The objective of this project is to provide a clear and interactive understanding of DFA minimization using the Myhill–Nerode theorem, focusing on both the algorithmic process and conceptual reasoning.
