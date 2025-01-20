# GitHub Project Grader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://www.npmjs.com/package/github-project-grader)

A powerful Node.js package that analyzes GitHub repositories for package implementation and code quality, providing detailed reports and grades.

## Features

- 📊 Automated code quality analysis
- 🔍 Package implementation verification
- 🤖 AI-powered code review
- 📝 Detailed markdown reports
- 🎯 Actionable recommendations
- 📈 Quality scoring system

## Installation
```bash
    npm install github-project-grader
```
## Quick Start
```typescript
    require('dotenv').config();
    const PackageAnalyzer = require('github-project-grader');

    const analyzer = new PackageAnalyzer({
        githubToken: process.env.GITHUB_TOKEN,
        openaiKey: process.env.OPENAI_KEY,
        pineconeKey: process.env.PINECONE_KEY
    });

    // Analyze a repository
    async function analyzeRepo() {
        const result = await analyzer.analyze('owner', 'repo', ['react']);
        console.log(`Grade: ${result.grade}`);
        console.log(`Score: ${result.score}`);
        console.log(`Pass: ${result.pass}`);
        console.log(result.report); // Detailed markdown report
    }

    analyzeRepo();
```

## Environment Variables

Create a `.env` file with the following variables:
```bash
    GITHUB_TOKEN=your_github_token
    OPENAI_KEY=your_openai_api_key
    PINECONE_KEY=your_pinecone_api_key
```
## API Documentation

### `PackageAnalyzer`

#### Constructor

    const analyzer = new PackageAnalyzer(config)

- `config` (Object):
  - `githubToken` (string): GitHub API token
  - `openaiKey` (string): OpenAI API key
  - `pineconeKey` (string): Pinecone API key
  - `patterns` (Object, optional): Custom package detection patterns

#### Methods

##### `analyze(owner, repo, requiredPackages)`

Analyzes a GitHub repository for package implementation and code quality.

- Parameters:
  - `owner` (string): GitHub repository owner
  - `repo` (string): Repository name
  - `requiredPackages` (string[]): Array of package names to analyze
- Returns: Promise<Object>
  - `pass` (boolean): Whether the repository passed the analysis
  - `score` (number): Overall score (0-100)
  - `grade` (string): Letter grade (S, A, B, C, D, F)
  - `report` (string): Detailed markdown report

##### `getPackageJson(owner, repo)`

Retrieves the package.json file from a repository.

- Parameters:
  - `owner` (string): GitHub repository owner
  - `repo` (string): Repository name
- Returns: Promise<Object | null>

##### `analyzeRepository(options)`

Performs detailed analysis of repository files and dependencies.

- Parameters:
  - `options` (Object):
    - `packageJson` (Object): Repository's package.json contents
    - `files` (Array): Repository files
    - `requiredPackages` (string[]): Packages to analyze
- Returns: Promise<Object>

##### `analyzeLLM(options)`

Performs AI-powered analysis of code quality and implementation.

- Parameters:
  - `options` (Object):
    - `files` (Array): Repository files
    - `analysis` (Object): Initial analysis results
    - `requiredPackages` (string[]): Packages analyzed
- Returns: Promise<Object>

## Grading System

- S (98-100): Outstanding
- A (90-97): Excellent
- B (80-89): Good
- C (70-79): Fair
- D (60-69): Poor
- F (0-59): Failing

A score of 77 or higher (B grade) is considered a passing grade.

## Example Report

The package generates detailed markdown reports that include:

- Executive Summary
- Package Dependencies Analysis
- Code Quality Assessment
- Implementation Quality
- Key Findings
- Recommendations (High/Medium/Low Priority)
- Technical Details

## Custom Package Patterns

You can define custom patterns for package detection:
```typescript
    const analyzer = new PackageAnalyzer({
        // ... auth tokens
        patterns: {
            'custom-package': {
                filePatterns: ['.js', '.ts'],
                codePatterns: ['import customPackage', 'require("custom-package")']
            }
        }
    });
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.