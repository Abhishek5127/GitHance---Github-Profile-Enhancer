# GitHance---Github-Profile-Enhancer

GitHance is a GitHub Profile Readme maker, Analyzer, and Beautifier Tool built with Next.js and React. It helps users create stunning GitHub profile READMEs with customizable templates, drag-and-drop builders, and real-time preview capabilities.

## Features

- **Profile Analyzer** - Analyze GitHub profiles and provide insights
- **Drag-and-Drop Builder** - Intuitive interface for building README layouts
- **Template Library** - Multiple pre-designed README templates
- **Real-time Preview** - Instant preview of changes as you build
- **Tech Stack Integration** - Display programming languages and tools
- **Contribution Graph** - Visualize GitHub contribution activity
- **Responsive Design** - Mobile-friendly interface
- **Customizable Themes** - Multiple color schemes and styling options

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript with JavaScript support
- **UI**: React 19.2.0 with Tailwind CSS
- **Styling**: Tailwind CSS with custom fonts (Antonio, Poppins, Danfo)
- **Animations**: Framer Motion
- **Drag & Drop**: @dnd-kit/core and @dnd-kit/sortable
- **Markdown**: react-markdown with remark-gfm
- **Database**: MongoDB
- **Linting**: ESLint with Next.js configuration
- **Build Tool**: Babel with React Compiler

## Installation

```bash
# Clone the repository
git clone https://github.com/abhishek5127/GitHance---Github-Profile-Enhancer.git
cd GitHance---Github-Profile-Enhancer

# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Usage

### Development
Run the development server to work on the project locally:
```bash
npm run dev
```

### Building README Assets
Generate README assets using the provided script:
```bash
npm run readme:assets
```

### Testing
Run JavaScript regression tests:
```bash
npm run test:security:js-regression
```

### Linting
Check code quality with ESLint:
```bash
npm run lint
```

## Configuration

### Environment Variables
The project uses MongoDB for data storage. Configure your database connection in `.env.local`:

```env
MONGODB_URI=your_mongodb_connection_string
```

### Next.js Configuration
The project includes custom Next.js configuration with:
- React Compiler enabled
- Remote image patterns for GitHub avatars and badges
- AVIF and WebP image formats support
- 24-hour image cache TTL

## Project Structure

```
src/
├── app/
│   ├── analyze/           # Profile analysis functionality
│   ├── UI/home/           # Main application interface
│   │   ├── ReadmeShowcaseTemplates/  # Pre-designed templates
│   │   └── readmeTemplates/          # Template assets
│   ├── components/        # Reusable UI components
│   ├── providers.js       # React context providers
│   └── layout.js          # Root layout
├── public/                # Static assets
└── scripts/               # Build and utility scripts
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

The Project is Open-Sourced.

## Support

For support and questions, please refer to the project's homepage: https://githance.in

## Scripts Reference

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run readme:assets` - Generate README assets
- `npm run test:security:js-regression` - Run JavaScript regression tests