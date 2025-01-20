const { Octokit } = require('@octokit/rest');
const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

class PackageAnalyzer {
    constructor(config) {
        this.octokit = new Octokit({ auth: config.githubToken });
        this.openai = new OpenAI({ apiKey: config.openaiKey });
        this.pinecone = new Pinecone({
            apiKey: config.pineconeKey
        });

        this.patterns = {
            'react': {
                filePatterns: ['.jsx', '.tsx', '.js', '.ts'],
                codePatterns: ['import { useState }', 'from "react"']
            },
            'express': {
                filePatterns: ['.js'],
                codePatterns: ['require("express")', 'import express']
            },
            ...config.patterns
        };
    }

    async analyze(owner, repo, requiredPackages) {
        try {
            const packageJson = await this.getPackageJson(owner, repo);
            if (!packageJson) {
                return {
                    pass: false,
                    score: 0,
                    grade: 'F',
                    report: '# Analysis Failed ❌\n\nNo package.json found in repository.'
                };
            }

            const files = await this.getRepositoryFiles(owner, repo);
            
            const analysis = await this.analyzeRepository({
                packageJson,
                files,
                requiredPackages
            });

            const llmAnalysis = await this.analyzeLLM({
                files,
                analysis,
                requiredPackages
            });

            return this.generateEnhancedReport(analysis, llmAnalysis);
        } catch (error) {
            console.error('Analysis failed:', error);
            throw error;
        }
    }

    async getPackageJson(owner, repo) {
        try {
            const { data } = await this.octokit.repos.getContent({
                owner,
                repo,
                path: 'package.json'
            });
            
            const content = Buffer.from(data.content, 'base64').toString();
            return JSON.parse(content);
        } catch (error) {
            return null;
        }
    }

    async getRepositoryFiles(owner, repo) {
        const files = [];
        await this.traverseRepository(owner, repo, '', files);
        return files;
    }

    async traverseRepository(owner, repo, path, files) {
        const { data } = await this.octokit.repos.getContent({
            owner,
            repo,
            path
        });

        for (const item of data) {
            if (item.type === 'file') {
                try {
                    const response = await fetch(item.download_url);
                    const content = await response.text();
                    files.push({
                        path: item.path,
                        name: item.name,
                        download_url: item.download_url,
                        content
                    });
                } catch (error) {
                    console.error(`Error fetching content for ${item.path}:`, error);
                }
            } else if (item.type === 'dir') {
                await this.traverseRepository(owner, repo, item.path, files);
            }
        }
    }

    async analyzeRepository({ packageJson, files, requiredPackages }) {
        const results = {
            dependencies: {},
            implementation: {}
        };

        const allDependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
        };

        for (const pkg of requiredPackages) {
            results.dependencies[pkg] = !!allDependencies[pkg];
            results.implementation[pkg] = await this.checkImplementation(pkg, files);
        }

        return results;
    }

    async checkImplementation(packageName, files) {
        const packagePatterns = this.patterns[packageName];
        if (!packagePatterns) {
            return { implemented: false, reason: 'No implementation patterns defined' };
        }

        const relevantFiles = files.filter(file => 
            packagePatterns.filePatterns.some(pattern => 
                file.path.endsWith(pattern)
            )
        );

        for (const file of relevantFiles) {
            if (packagePatterns.codePatterns.some(pattern => file.content.includes(pattern))) {
                return { 
                    implemented: true, 
                    file: file.path,
                    content: file.content
                };
            }
        }

        return { implemented: false, reason: 'No implementation found' };
    }

    async analyzeLLM({ files, analysis, requiredPackages }) {
        const results = {
            codeQuality: {},
            implementationQuality: {},
            suggestions: {}
        };

        for (const pkg of requiredPackages) {
            const implementation = analysis.implementation[pkg];
            if (implementation.implemented) {
                try {
                    const fileContent = implementation.content;
                    results.codeQuality[pkg] = await this.analyzeCodeQuality(pkg, fileContent);
                    results.implementationQuality[pkg] = await this.analyzeImplementationQuality(pkg, fileContent);
                    results.suggestions[pkg] = await this.generateSuggestions(pkg, fileContent);
                } catch (error) {
                    console.error(`Error analyzing ${pkg}:`, error);
                    results.codeQuality[pkg] = { error: 'Failed to analyze code' };
                    results.implementationQuality[pkg] = { error: 'Failed to analyze implementation' };
                    results.suggestions[pkg] = { error: 'Failed to generate suggestions' };
                }
            } else {
                console.log(`Skipping analysis for ${pkg} - No implementation found`);
                results.codeQuality[pkg] = { error: 'No implementation found' };
                results.implementationQuality[pkg] = { error: 'No implementation found' };
                results.suggestions[pkg] = { error: 'No implementation found' };
            }
        }

        return results;
    }

    async analyzeCodeQuality(packageName, content) {
        const prompt = `Analyze the following code for quality metrics regarding ${packageName} usage. 
        Consider:
        1. Best practices
        2. Error handling
        3. Performance considerations
        4. Security implications
        5. Code organization

        Provide your response in JSON format:
        {
            "score": number (0-100),
            "reasoning": string (detailed analysis),
            "keyFindings": string[] (list of main points)
        }

        Code:
        ${content}

        Make sure you return only valid JSON (no code fences, no markdown formatting).`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a code quality analysis expert. Provide detailed, technical analysis in clean JSON format without any markdown or code formatting." },
                { role: "user", content: prompt }
            ],
            temperature: 0
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async analyzeImplementationQuality(packageName, content) {
        const prompt = `Analyze how effectively ${packageName} is implemented in this code.
        Consider:
        1. Feature utilization
        2. Integration patterns
        3. Configuration
        4. Package-specific best practices

        Provide your response in JSON format:
        {
            "score": number (0-100),
            "reasoning": string (detailed analysis),
            "keyFindings": string[] (list of main points)
        }

        Code:
        ${content}

        Make sure you return only valid JSON (no code fences, no markdown formatting).`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are an expert in JavaScript package implementation analysis. Return only clean JSON without any markdown or code formatting." },
                { role: "user", content: prompt }
            ],
            temperature: 0
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async generateSuggestions(packageName, content) {
        const prompt = `Review this ${packageName} implementation and provide specific improvement suggestions.
        Focus on:
        1. Code optimization
        2. Better package utilization
        3. Security improvements
        4. Performance enhancements

        Provide your response in JSON format:
        {
            "suggestions": string[] (list of specific, actionable suggestions),
            "priority": string[] (high/medium/low for each suggestion)
        }

        Code:
        ${content}

        Make sure you return only valid JSON (no code fences, no markdown formatting).`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are an expert code reviewer. Provide specific, actionable suggestions in clean JSON format without any markdown or code formatting." },
                { role: "user", content: prompt }
            ],
            temperature: 0
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async generateEnhancedReport(analysis, llmAnalysis) {
        const scoreAnalysis = await this.calculateLLMScore(llmAnalysis);
        console.log("scoreAnalysis",scoreAnalysis.score >= 77);
        const reportContent = await this.generateDetailedReport({
            analysis,
            llmAnalysis,
            score: scoreAnalysis.score,
            grade: scoreAnalysis.grade,
            reasoning: scoreAnalysis.reasoning
        });

        return {
            pass: scoreAnalysis.score >= 77, // B grade or above
            score: scoreAnalysis.score,
            grade: scoreAnalysis.grade,
            report: reportContent
        };
    }

    async calculateLLMScore(llmAnalysis) {
        const prompt = `Analyze the following code quality metrics and provide a single numerical score out of 100.
        
        Code Quality Analysis:
        ${JSON.stringify(llmAnalysis.codeQuality, null, 2)}
        
        Implementation Quality Analysis:
        ${JSON.stringify(llmAnalysis.implementationQuality, null, 2)}
        
        Your response should be in JSON format:
        {
            "score": number (0-100),
            "reasoning": string (brief explanation of the score)
        }

        Make sure you return only valid JSON (no code fences, no markdown formatting).`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a precise code quality scoring system. Provide exact numerical scores in clean JSON format without any markdown or code formatting." },
                { role: "user", content: prompt }
            ],
            temperature: 0
        });

        const result = JSON.parse(response.choices[0].message.content);
        return {
            score: result.score,
            grade: this.getEnhancedGrade(result.score),
            reasoning: result.reasoning
        };
    }

    getEnhancedGrade(score) {
        if (score >= 98) return 'S';
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    async generateDetailedReport(data) {
        const passDisplay = data.score >= 80
            ? `<h2 style="color: #22c55e; font-size: 3em">✓ PASS</h2>`
            : `<h2 style="color: #ef4444; font-size: 3em">⨉ FAIL</h2>`;
    
        const prompt = `Create a detailed markdown report for a code analysis with the following structure.
        Use the data provided but maintain consistent formatting and professionalism throughout.
        
        The report MUST start exactly with:
    
        # Code Quality Analysis Report
    
        <div align="center">
            <h1 style="font-size: 4em">${this.getGradeEmoji(data.grade)} Grade: ${data.grade}</h1>
            ${passDisplay}
            <h3>Overall Score: ${data.score}%</h3>
        </div>
    
        ---
    
        # Executive Summary
        ${data.pass 
            ? "This codebase has successfully passed the quality assessment, achieving a satisfactory grade of " 
            : "This codebase has not met the minimum quality requirements, receiving a grade of "}${data.grade} with a score of ${data.score}%. 
        ${data.reasoning}
    
        Then continue with the following sections, using appropriate emoji indicators throughout:
    
        # Detailed Analysis
    
        ## Package Dependencies
        For each package analyzed:
        - Installation status
        - Implementation status
        - Key metrics
        - Specific findings
    
        ## Code Quality Assessment 🎯
        - Overall code quality score and grade
        - Key strengths
        - Areas for improvement
        - Critical issues (if any)
    
        ## Implementation Quality ⚙️
        - Framework/library usage effectiveness
        - Best practices adherence
        - Integration patterns
        - Configuration quality
    
        # Key Findings 🔍
        - List the most important discoveries (both positive and negative)
        - Impact assessment for each finding
        - Risk level for any issues found
    
        # Recommendations 💡
        
        ## High Priority
        - Immediate action items
        - Critical improvements needed
        
        ## Medium Priority
        - Important but not urgent improvements
        - Best practice recommendations
    
        ## Low Priority
        - Nice-to-have improvements
        - Long-term considerations
    
        # Technical Details ⚙️
        - Detailed metrics
        - Implementation specifics
        - Performance considerations
        - Security aspects
    
        Use these emojis appropriately throughout the report:
        - ⭐ for S grade (Outstanding)
        - 🏆 for A grade (Excellent)
        - ✅ for B grade (Good)
        - ⚠️ for C grade (Fair)
        - ⚡ for D grade (Poor)
        - ❌ for F grade (Failing)
        - 🎯 for key metrics
        - 💡 for recommendations
        - 🔍 for detailed findings
        - ✨ for highlights
        - 🚀 for performance wins
        - 🛡️ for security aspects
        - ⚙️ for technical details
        - 📊 for metrics
        - 🔄 for patterns
        - ⚠️ for warnings
        - 🎨 for code style
        - 📝 for documentation
    
        Style Guidelines:
        1. Use markdown tables for comparing metrics
        2. Use bold text for important points
        3. Use code blocks for technical references
        4. Use horizontal rules (---) to separate major sections
        5. Each section should have a clear heading
        6. Use bullet points for findings and recommendations
        7. Include relevant code snippets where helpful
        8. Use blockquotes for important callouts
        9. Keep the tone professional but engaging
    
        Analysis Data:
        ${JSON.stringify(data, null, 2)}
    
        Ensure the report is comprehensive, professional, and provides actionable insights while maintaining a clear structure and visual hierarchy.`;
    
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { 
                    role: "system", 
                    content: "You are a technical report generator specializing in code quality analysis. Create detailed, actionable reports with clear visual hierarchy and professional formatting. Always ensure the pass/fail status matches the provided boolean value and maintain consistency in grading and recommendations."
                },
                { 
                    role: "user", 
                    content: prompt 
                }
            ],
            temperature: 0.2
        });
    
        return response.choices[0].message.content;
    }

    // async generateDetailedReport(data) {
    //     const prompt = `Create a detailed markdown report for a code analysis with the following structure:
    
    //     # HEADER SECTION
    //     Start with a large, centered grade display using this format:
    //     <div align="center">
    //         <h1 style="font-size: 4em">${this.getGradeEmoji(data.grade)} Grade: ${data.grade}</h1>
    //         ${data.pass 
    //             ? '<h2 style="color: #22c55e; font-size: 3em">✓ PASS</h2>' 
    //             : '<h2 style="color: #ef4444; font-size: 3em">⨉ FAIL</h2>'
    //         }
    //         <h3>Overall Score: ${data.score}%</h3>
    //     </div>
    
    //     ---
    
    //     # Executive Summary
    //     - Start with a concise one-paragraph summary of the overall analysis
    //     - Highlight the key reasons for the pass/fail status
    //     - Include the analysis timestamp and scope
    
    //     # Detailed Analysis
    //     ## Package Dependencies
    //     For each required package:
    //     - Installation status
    //     - Implementation status
    //     - Key metrics
    //     - Specific findings
    
    //     ## Code Quality Assessment
    //     - Overall code quality score and grade
    //     - Key strengths
    //     - Areas for improvement
    //     - Critical issues (if any)
    
    //     ## Implementation Quality
    //     - Framework/library usage effectiveness
    //     - Best practices adherence
    //     - Integration patterns
    //     - Configuration quality
    
    //     # Key Findings
    //     - List the most important discoveries (both positive and negative)
    //     - Impact assessment for each finding
    //     - Risk level for any issues found
    
    //     # Recommendations
    //     ## High Priority
    //     - Immediate action items
    //     - Critical improvements needed
        
    //     ## Medium Priority
    //     - Important but not urgent improvements
    //     - Best practice recommendations
    
    //     ## Low Priority
    //     - Nice-to-have improvements
    //     - Long-term considerations
    
    //     # Technical Details
    //     - Detailed metrics
    
    //     Use these emojis appropriately throughout the report:
    //     - ⭐ for S grade (Outstanding)
    //     - 🏆 for A grade (Excellent)
    //     - ✅ for B grade (Good)
    //     - ⚠️ for C grade (Fair)
    //     - ⚡ for D grade (Poor)
    //     - ❌ for F grade (Failing)
    //     - 🎯 for key metrics
    //     - 💡 for recommendations
    //     - 🔍 for detailed findings
    //     - ✨ for highlights
    //     - 🚀 for performance wins
    //     - 🛡️ for security aspects
    //     - ⚙️ for technical details
    //     - 📊 for metrics
    //     - 🔄 for patterns
    //     - ⚠️ for warnings
    //     - 🎨 for code style
    //     - 📝 for documentation
        
    //     Style Guidelines:
    //     1. Use markdown tables for comparing metrics
    //     2. Use bold text for important points
    //     3. Use code blocks for technical references
    //     4. Use horizontal rules to separate major sections
    //     5. Use subheadings for clear organization
    //     6. Use bullet points for lists of findings
    //     7. Include code snippets where relevant
    //     8. Use blockquotes for important callouts
    //     9. Maintain professional tone while being engaging
    //     10. Use consistent formatting throughout
    
    //     Analysis Data:
    //     ${JSON.stringify(data, null, 2)}
    
    //     Create a comprehensive, professional report that is both detailed and easy to read. Focus on actionable insights and clear presentation of findings.`;
    
    //     const response = await this.openai.chat.completions.create({
    //         model: "gpt-4o-mini",
    //         messages: [
    //             { 
    //                 role: "system", 
    //                 content: "You are a technical report generator specializing in code quality analysis. Create detailed, actionable reports with clear visual hierarchy and professional formatting."
    //             },
    //             { role: "user", content: prompt }
    //         ],
    //         temperature: 0.2
    //     });
    
    //     return response.choices[0].message.content;
    // }
    
    // Helper function to get grade emoji
    getGradeEmoji(grade) {
        const emojiMap = {
            'S': '⭐',
            'A': '🏆',
            'B': '✅',
            'C': '⚠️',
            'D': '⚡',
            'F': '❌'
        };
        return emojiMap[grade] || '❓';
    }

    

    // async generateDetailedReportOld(data) {
    //     const prompt = `Create a detailed markdown report for a code analysis with the following data:
    //     ${JSON.stringify(data, null, 2)}

    //     The report should:
    //     1. Start with an executive summary including the grade and pass/fail status with appropriate emojis
    //     2. Include detailed analysis of code quality and implementation for each package
    //     3. List key findings and recommendations
    //     4. Use appropriate emojis for visual emphasis
    //     5. Format everything in clean, readable markdown

    //     Use these emojis:
    //     - ⭐ for S grade
    //     - 🏆 for A grade
    //     - ✅ for B grade
    //     - ⚠️ for C grade
    //     - ⚡ for D grade
    //     - ❌ for F grade
    //     - 🎯 for key metrics
    //     - 💡 for recommendations
    //     - 🔍 for detailed findings
        
    //     Make the report professional but engaging.`;

    //     const response = await this.openai.chat.completions.create({
    //         model: "gpt-4o-mini",
    //         messages: [
    //             { role: "system", content: "You are a technical report generator specializing in code quality analysis." },
    //             { role: "user", content: prompt }
    //         ],
    //         temperature: 0.3
    //     });

    //     return response.choices[0].message.content;
    // }
}

async function main() {
    const analyzer = new PackageAnalyzer({
        githubToken: process.env.GITHUB_TOKEN,
        openaiKey: process.env.OPENAI_KEY,
        pineconeKey: process.env.PINECONE_KEY
    });

    const owner = 'decagondev';
    const repo = 'vite-student-portal';
    const result = await analyzer.analyze(owner, repo, ['react']);

    // write the result to a file
    fs.writeFileSync(`./report-${owner}-${repo}-${result.grade}-${new Date().toISOString().split('T')[0]}.md`, result.report);
}

main();

module.exports = {
    PackageAnalyzer
}
