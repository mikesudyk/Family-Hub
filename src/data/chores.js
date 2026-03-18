// Initial chore data — keyed by family member id
export const INITIAL_CHORES = {
  3: [ // Elijah
    { id: 1,  name: "Take out trash",     icon: "🗑️", time: "Morning",   done: true,  doneAt: "7:45am", fixed: true  },
    { id: 2,  name: "Vacuum living room", icon: "🧹", time: "Afternoon", done: true,  doneAt: "3:20pm", fixed: true  },
    { id: 3,  name: "Wash dishes",        icon: "🍽️", time: "Evening",   done: false, fixed: false },
    { id: 4,  name: "Fold laundry",       icon: "👕", time: "Afternoon", done: false, fixed: false },
  ],
  4: [ // Alyssandra
    { id: 5,  name: "Sweep kitchen",  icon: "🧹", time: "Morning",   done: true,  doneAt: "8:10am", fixed: true  },
    { id: 6,  name: "Clean bathroom", icon: "🚿", time: "Morning",   done: false, fixed: true  },
    { id: 7,  name: "Feed dog",       icon: "🐕", time: "Morning",   done: true,  doneAt: "7:30am", fixed: true  },
    { id: 8,  name: "Fold laundry",   icon: "👕", time: "Afternoon", done: false, fixed: false },
  ],
  5: [ // Emori
    { id: 9,  name: "Make bed",     icon: "🛏️", time: "Morning",   done: true,  doneAt: "8:00am", fixed: true },
    { id: 10, name: "Pick up toys", icon: "🧸", time: "Afternoon", done: false, fixed: true },
    { id: 11, name: "Feed fish",    icon: "🐟", time: "Morning",   done: true,  doneAt: "7:55am", fixed: true },
  ],
  6: [ // Malachi
    { id: 12, name: "Make bed",     icon: "🛏️", time: "Morning",   done: true,  doneAt: "8:30am", fixed: true },
    { id: 13, name: "Set table",    icon: "🍴", time: "Evening",   done: false, fixed: true },
    { id: 14, name: "Pick up toys", icon: "🧸", time: "Afternoon", done: false, fixed: true },
  ],
  7: [ // Roman
    { id: 15, name: "Make bed",      icon: "🛏️", time: "Morning", done: true,  doneAt: "9:00am", fixed: true },
    { id: 16, name: "Put toys away", icon: "🧸", time: "Evening", done: false, fixed: true },
  ],
  8: [ // Arielle
    { id: 17, name: "Put shoes away", icon: "👟", time: "Morning", done: false, fixed: true },
    { id: 18, name: "Help set table", icon: "🍴", time: "Evening", done: false, fixed: true },
  ],
};
