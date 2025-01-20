# GitHub Project Grader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://www.npmjs.com/package/github-project-grader)

A powerful Node.js package that analyzes GitHub repositories for package implementation and code quality, providing detailed markdown reports and grades.

## Features

- 📊 Automated code quality analysis  
- 🔍 Package implementation verification  
- 🤖 AI-powered code review  
- 📝 Detailed markdown reports  
- 🎯 Actionable recommendations  
- 📈 Quality scoring system  

## Installation

Install via npm:

```bash
npm install github-project-grader
```

(or via yarn):

```bash
yarn add github-project-grader
```

## Quick Start

Below is an example of how to use the PackageAnalyzer in a Node.js environment:

```js
require('dotenv').config();
const { PackageAnalyzer } = require('github-project-grader');

// Initialize with your tokens
const analyzer = new PackageAnalyzer({
    githubToken: process.env.GITHUB_TOKEN,
    openaiKey: process.env.OPENAI_KEY,
    pineconeKey: process.env.PINECONE_KEY
});

// Analyze a repository
async function analyzeRepo() {
    try {
        const result = await analyzer.analyze('owner', 'repo', ['react']);

        console.log(`Grade: ${result.grade}`);
        console.log(`Score: ${result.score}`);
        console.log(`Pass: ${result.pass}`);
        console.log(result.report); // Detailed markdown report
    } catch (error) {
        console.error('Analysis failed:', error);
    }
}

analyzeRepo();
```

Make sure you have created a `.env` file in the root of your project (see below) and placed your API tokens in it.

## Environment Variables

Create a `.env` file with the following variables:
```bash
GITHUB_TOKEN=your_github_token
OPENAI_KEY=your_openai_api_key
PINECONE_KEY=your_pinecone_api_key
```
These tokens are required for the GitHub, OpenAI, and Pinecone integrations necessary for the analysis.

## Usage

1. Install the package:  
   npm install github-project-grader

2. Set up your environment variables in a .env file.

3. Create a script (like "analyze.js") containing the usage example. Adjust the repository owner, name, and packages to your needs.

4. Run node analyze.js (or whichever script name you chose).

The resulting analysis will contain:
- Pass/Fail status
- Code quality score
- Weighted grade
- Detailed markdown report

You can then further use or parse the markdown report as needed, or commit it back to your project.

## API Documentation

### PackageAnalyzer

#### Constructor

```js
const analyzer = new PackageAnalyzer(config)
```

- **config** (Object):  
  - **githubToken** (string): GitHub API token.  
  - **openaiKey** (string): OpenAI API key.  
  - **pineconeKey** (string): Pinecone API key.  
  - **patterns** (Object, optional): Custom package detection patterns.  

#### Methods

--------------------------------------------------------------------------------

##### analyze(owner, repo, requiredPackages)

Analyzes a GitHub repository for package implementation and code quality.

- **Parameters**:  
  - **owner** (string): GitHub repository owner.  
  - **repo** (string): Repository name.  
  - **requiredPackages** (string[]): Array of package names to analyze.  

- **Returns**: Promise<Object>  
  - **pass** (boolean): Whether the repository passed the analysis.  
  - **score** (number): Overall score (0-100).  
  - **grade** (string): Letter grade (S, A, B, C, D, F).  
  - **report** (string): Detailed markdown report.  

--------------------------------------------------------------------------------

##### getPackageJson(owner, repo)

Retrieves the package.json file from a repository.

- **Parameters**:  
  - **owner** (string): GitHub repository owner.  
  - **repo** (string): Repository name.  

- **Returns**: Promise<Object | null> (the parsed package.json content or null if not found).

--------------------------------------------------------------------------------

##### analyzeRepository(options)

Performs detailed analysis of repository files and dependencies.

- **Parameters** (Object):
  - **packageJson** (Object): Repository's package.json contents.  
  - **files** (Array): Array of repository file objects.  
  - **requiredPackages** (string[]): Packages to analyze.  

- **Returns**: Promise<Object> (analysis data).

--------------------------------------------------------------------------------

##### analyzeLLM(options)

Performs AI-powered analysis of code quality and implementation.

- **Parameters** (Object):
  - **files** (Array): Repository files.  
  - **analysis** (Object): Initial analysis results.  
  - **requiredPackages** (string[]): Packages analyzed.  

- **Returns**: Promise<Object> (AI-generated insights and suggestions).

## Grading System

The package uses a 6-tier, letter-based grading system:

- S (98–100): Outstanding ⭐  
- A (90–97): Excellent 🏆  
- B (80–89): Good ✅  
- C (70–79): Fair ⚠️  
- D (60–69): Poor ⚡  
- F (0–59): Failing ❌  

A score of 80 or higher (B grade) is considered passing.

## Example Report

The package generates detailed markdown reports that include:

- Executive Summary  
- Package Dependencies Analysis  
- Code Quality Assessment  
- Implementation Quality  
- Key Findings  
- Recommendations (High/Medium/Low Priority)  
- Technical Details  

The section headers, emojis, and formatting are all generated via AI prompts to maintain consistency and professionalism.

## Custom Package Patterns

You can define custom detection patterns for specific packages in your configuration:

```js
const { PackageAnalyzer } = require('github-project-grader');

const analyzer = new PackageAnalyzer({
    githubToken: process.env.GITHUB_TOKEN,
    openaiKey: process.env.OPENAI_KEY,
    pineconeKey: process.env.PINECONE_KEY,
    patterns: {
        'custom-package': {
            filePatterns: ['.js', '.ts'],
            codePatterns: ['import customPackage', 'require("custom-package")']
        }
    }
});
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request with improvements or additional features.

## License

This project is licensed under the MIT License. See the LICENSE file for more information.