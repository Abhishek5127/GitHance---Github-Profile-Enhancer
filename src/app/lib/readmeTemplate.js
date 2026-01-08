// lib/readmeTemplate.js

export const README_TEMPLATE = [
  {
    id: 1,
    key: "title",
    title: "Project Title",
    type: "text",
    placeholder: "Enter your project title..."
  },

  {
    id: 2,
    key: "overview",
    title: "Overview",
    type: "textarea",
    placeholder: "Briefly describe what your project does..."
  },

  {
    id: 3,
    key: "features",
    title: "Features",
    type: "list",
    placeholder: "Add a feature",
    default: ["Feature 1", "Feature 2", "Feature 3"]
  },

  {
    id: 4,
    key: "techstack",
    title: "Tech Stack",
    type: "list",
    placeholder: "Add a technology used",
    default: ["React", "Node.js", "MongoDB"]
  },

  {
    id: 5,
    key: "installation",
    title: "Installation",
    type: "code",
    placeholder: "Enter installation steps...",
    default: [
      "git clone https://github.com/USER/REPO",
      "cd project-folder",
      "npm install",
      "npm start"
    ]
  },

  {
    id: 6,
    key: "usage",
    title: "Usage",
    type: "textarea",
    placeholder: "Explain how to use your project..."
  },

  {
    id: 7,
    key: "screenshots",
    title: "Screenshots",
    type: "image-list",
    placeholder: "Upload or link screenshots..."
  },

  {
    id: 8,
    key: "apiRoutes",
    title: "API Routes",
    type: "code",
    placeholder: "List API endpoints with examples...",
    default: ["GET /api/users", "POST /api/login"]
  },

  {
    id: 9,
    key: "folderStructure",
    title: "Folder Structure",
    type: "code",
    placeholder: "Describe your folder structure...",
    default: [
      "/src",
      " ├── components/",
      " ├── pages/",
      " ├── utils/",
      " └── assets/"
    ]
  },

  {
    id: 10,
    key: "contributing",
    title: "Contributing",
    type: "textarea",
    placeholder: "Guidelines for contributing...",
    default: "Pull requests are welcome!"
  },

  {
    id: 11,
    key: "license",
    title: "License",
    type: "text",
    placeholder: "License type (e.g., MIT, Apache 2.0)",
    default: "MIT License"
  }
];
