# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses by entering transactions with a name, amount, and category. The app displays a running total balance, a scrollable transaction list with delete capability, and a pie chart visualizing spending distribution by category. All data is persisted in the browser's LocalStorage. The application is built with HTML, CSS, and Vanilla JavaScript — no backend or build tools required.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Category**: One of three predefined expense classifications: Food, Transport, or Fun.
- **Transaction_List**: The scrollable UI component that displays all recorded transactions.
- **Balance_Display**: The UI element shown at the top of the App that reflects the sum of all transaction amounts.
- **Input_Form**: The UI form through which the user enters new transactions.
- **Validator**: The client-side logic responsible for checking that all required form fields are filled before submission.
- **Chart**: The pie chart UI component that visualizes spending distribution by category.
- **Storage**: The browser's LocalStorage API used to persist transaction data across sessions.
- **Chart_Library**: An external JavaScript charting library (e.g., Chart.js) used to render the pie chart.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter expense details through a form, so that I can record my spending transactions.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name accepting up to 100 characters, a numeric field for the amount accepting values between 0.01 and 999999999.99, and a dropdown selector for the category with exactly three options: Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add a new Transaction to the Transaction_List containing the entered item name, amount, category, and the date and time of submission.
3. WHEN the user submits the Input_Form with all fields filled, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the category selector to its default unselected state.
4. IF the user submits the Input_Form with one or more fields empty or the category selector unselected, THEN THE Validator SHALL prevent the Transaction from being added and display an inline error message adjacent to each empty field indicating that the field is required.
5. IF the user enters a value of zero, a negative number, a non-numeric value, or a value greater than 999999999.99 in the amount field, THEN THE Validator SHALL prevent submission and display an inline error message adjacent to the amount field indicating that the amount must be a number between 0.01 and 999999999.99.
6. IF the user enters more than 100 characters in the item name field, THEN THE Validator SHALL prevent submission and display an inline error message adjacent to the item name field indicating that the item name must not exceed 100 characters.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a list, so that I can review what I have spent.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored Transactions, each showing the item name (up to 100 characters), amount (formatted to 2 decimal places), and category.
2. THE Transaction_List SHALL be scrollable when the number of Transactions exceeds the visible area of the Transaction_List container.
3. WHEN the user clicks the delete control on a Transaction, THE App SHALL remove that Transaction from the Transaction_List and from Storage without affecting any other stored Transactions.
4. IF the delete operation fails, THEN THE App SHALL display an error message indicating the Transaction could not be deleted and retain that Transaction in the Transaction_List and in Storage.
5. WHEN no Transactions exist, THE Transaction_List SHALL display an empty-state message indicating that no expenses have been added yet.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending at a glance, so that I can monitor my overall expenditure.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of the amounts of all Transactions currently in Storage, rounded to 2 decimal places.
2. WHEN a new Transaction is added, THE Balance_Display SHALL update to reflect the new total within 1 second without requiring a page reload.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the revised total within 1 second without requiring a page reload.
4. WHEN no Transactions exist, THE Balance_Display SHALL display a total of 0.00.
5. IF Storage returns an error during a read operation, THEN THE Balance_Display SHALL display 0.00 and THE App SHALL show an informational message to the user indicating data could not be loaded.

---

### Requirement 4: Category Pie Chart

**User Story:** As a user, I want to see a visual breakdown of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL display a pie chart rendered by Chart_Library showing the proportion of total spending for each Category that has at least one Transaction, where each slice size is proportional to that Category's sum of Transaction amounts divided by the total sum of all Transaction amounts, displayed as a percentage rounded to one decimal place.
2. WHEN a new Transaction is added, THE Chart SHALL update automatically to reflect the new spending distribution without requiring a page reload, within 1 second of the Transaction being confirmed.
3. WHEN a Transaction is deleted, THE Chart SHALL update automatically to reflect the revised spending distribution without requiring a page reload, within 1 second of the deletion being confirmed.
4. WHEN no Transactions exist, THE Chart SHALL display a placeholder state containing a message indicating there is no data to visualize, in place of the pie chart.
5. THE Chart SHALL include a legend identifying each Category represented in the chart, where each legend entry displays the Category name and its percentage of total spending rounded to one decimal place.
6. IF a Category's calculated percentage of total spending rounds to 0.0%, THEN THE Chart SHALL exclude that Category's slice and legend entry from the displayed chart.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that I do not lose my expense history when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE Storage SHALL save the updated Transaction collection to LocalStorage within 500 milliseconds.
2. WHEN a Transaction is deleted, THE Storage SHALL save the updated Transaction collection to LocalStorage within 500 milliseconds.
3. WHEN the App loads, THE App SHALL read all previously saved Transactions from Storage and render them in the Transaction_List, Balance_Display, and Chart within 1000 milliseconds.
4. IF LocalStorage is unavailable or returns a parse error on load, THEN THE App SHALL initialize with an empty Transaction collection and display an informational message to the user.
5. IF a save operation to LocalStorage fails, THEN THE App SHALL notify the user that the save failed and preserve the current Transaction collection in memory so the user can continue the session.

---

### Requirement 6: Project Structure & Technical Constraints

**User Story:** As a developer, I want the codebase to follow a clear, minimal structure, so that the project is easy to understand and maintain.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no backend server, no build tools, and no third-party JavaScript frameworks or libraries beyond the Chart_Library referenced in criterion 5.
2. THE App SHALL contain exactly one CSS file located in the `css/` directory and no other CSS files anywhere in the project structure.
3. THE App SHALL contain exactly one JavaScript file located in the `js/` directory and no other JavaScript files anywhere in the project structure, excluding CDN-loaded scripts.
4. THE App SHALL function correctly — meaning all features produce expected outputs with no uncaught JavaScript errors — in the latest stable versions of Chrome, Firefox, Edge, and Safari at the time of release.
5. WHERE Chart_Library is loaded from a CDN, THE App SHALL reference it via a `<script>` tag placed in the HTML file before the application JavaScript file, and require no local installation or download to function.

---

### Requirement 7: Performance & Visual Design

**User Story:** As a user, I want the app to be fast and visually clear, so that using it feels smooth and effortless.

#### Acceptance Criteria

1. WHEN the App is opened, THE App SHALL render the full initial UI within 2 seconds on a connection with download speed of at least 25 Mbps.
2. WHEN the user adds or deletes a Transaction, THE App SHALL update the Balance_Display, Transaction_List, and Chart within 100 milliseconds of the user confirming the action.
3. THE App SHALL apply a visual design where body text uses a minimum font size of 16px, secondary labels use a minimum font size of 12px, all text meets a WCAG 4.5:1 contrast ratio against its background, and heading text is visually distinct from body text.
4. THE App SHALL be usable as a standalone web page opened directly from the file system (via `file://` protocol) without requiring a local server.
5. WHEN the App is viewed on a viewport narrower than 320px, THE App SHALL remain usable with no content clipped or hidden outside the viewport boundary.
