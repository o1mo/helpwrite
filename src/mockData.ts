import { Article, TranscriptEntry, Goal, Edit } from './types';

export const mockArticles: Article[] = [
  {
    id: '1',
    title: 'Setting Up Payroll in Australia',
    content: `# Setting Up Payroll in Australia

Getting started with Australian payroll requires careful attention to several key areas. This guide will help you understand the fundamental requirements and processes.

## Initial Registration
Before processing your first payroll, you'll need to:
1. Register for PAYG withholding with the ATO
2. Set up Single Touch Payroll (STP) reporting
3. Register for state payroll tax if your total Australian wages exceed the threshold
4. Set up your superannuation clearing house account

## Tax File Numbers
Every employee must provide a Tax File Number (TFN) declaration. Without a TFN, you must withhold tax at the highest marginal rate. New employees have 28 days to provide their TFN.

## Pay Cycles
Most Australian businesses process payroll weekly, fortnightly, or monthly. Your choice should balance administrative overhead with employee preferences. Whatever cycle you choose, you must maintain consistent payment dates.

## Record Keeping
You must maintain detailed payroll records for 7 years, including:
- Payment details and amounts
- Superannuation contributions
- Tax withholding records
- Leave accrual and usage
- Employment contracts and variations`,
    path: '/payroll/australia/setup.md',
    lastModified: '2024-01-15',
    category: {
      name: 'Australia',
      path: '/payroll/australia'
    }
  },
  {
    id: '2',
    title: 'Employee Classification in France',
    content: `# Employee Classification in France

Understanding worker classification in France is crucial for compliance. This guide covers the main employment categories and their implications.

## Employment Contract Types
The French labor code recognizes several types of employment contracts. The most common are:

### Permanent Contracts (CDI)
The standard and preferred form of employment in France. CDIs offer the highest level of job security and are considered the default contract type.

### Fixed-Term Contracts (CDD)
Used for temporary assignments, replacements, or seasonal work. CDDs have strict rules regarding duration and renewal.

## Working Hours
The standard work week is 35 hours. Any hours worked beyond this are considered overtime and must be compensated accordingly. Managers and executives may have different hour calculations.

## Social Security Categories
Employees are classified into different social security categories that determine contribution rates:
- Non-cadre (non-executive)
- Cadre (executive)
- Cadre supérieur (senior executive)

## Independent Contractors
Freelance workers must register as either:
- Auto-entrepreneur
- Entreprise individuelle
- EURL/SARL (company structures)

Each status has different tax implications and social security obligations.`,
    path: '/payroll/france/classification.md',
    lastModified: '2024-02-01',
    category: {
      name: 'France',
      path: '/payroll/france'
    }
  },
  {
    id: '3',
    title: 'UK Payroll Tax Guide',
    content: `# UK Payroll Tax Guide

A comprehensive guide to UK payroll taxes and compliance requirements for employers.

## PAYE System Overview
The Pay As You Earn (PAYE) system is the UK's method for collecting Income Tax and National Insurance contributions (NICs) from employees. Employers must:
- Register as an employer with HMRC
- Run payroll through approved software
- Report to HMRC through Real Time Information (RTI)
- Make deductions for Income Tax and NICs
- Pay HMRC monthly or quarterly

## Tax Codes
Tax codes tell employers how much tax to deduct. Common codes include:
- 1257L: Standard tax-free Personal Allowance
- BR: All income taxed at basic rate
- D0: All income taxed at higher rate
- NT: No tax to be deducted

## National Insurance Contributions
Both employers and employees must make NICs:
- Employee Class 1 NICs: 12% between £242 and £967 per week
- Employer NICs: 13.8% on earnings above £175 per week
- Different rates apply for certain age groups and circumstances

## Benefits in Kind
Taxable benefits must be reported through P11D forms. Common benefits include:
- Company cars
- Private medical insurance
- Living accommodation
- Interest-free loans over £10,000

## Year-End Procedures
Key tasks for payroll year-end:
1. Submit final Full Payment Submission (FPS)
2. Process P60s for all employees
3. Report expenses and benefits on P11D forms
4. Update employee tax codes for new tax year
5. Process any tax code changes from HMRC`,
    path: '/payroll/uk/tax-guide.md',
    lastModified: '2024-02-15',
    category: {
      name: 'United Kingdom',
      path: '/payroll/uk'
    }
  },
  {
    id: '4',
    title: 'German Employment Law Basics',
    content: `# German Employment Law Basics

Essential information about German employment regulations and requirements.

## Employment Contracts
German law requires written contracts containing:
- Names and addresses of both parties
- Start date and duration (if temporary)
- Job description and location
- Working hours and salary
- Holiday entitlement
- Notice periods
- Reference to applicable collective agreements

## Working Time Regulations
Standard working time requirements:
- Maximum 8 hours per day
- 48 hours per week maximum
- Minimum 11 hours rest between workdays
- Working on Sundays requires special permission
- Minimum 20 days paid vacation annually

## Social Security System
Mandatory social security contributions include:
- Pension insurance (18.6% total)
- Health insurance (14.6% plus supplement)
- Unemployment insurance (2.4%)
- Long-term care insurance (3.05%)
- Accident insurance (varies by industry)

## Protection Against Dismissal
The Kündigungsschutzgesetz (KSchG) provides:
- Protection after 6 months employment
- Valid reasons required for termination
- Notice periods based on length of service
- Special protection for certain groups
- Works council consultation requirements

## Employee Representation
Rights and requirements include:
- Works councils in companies with 5+ employees
- Collective bargaining agreements
- Co-determination in larger companies
- Employee participation in decision-making`,
    path: '/payroll/germany/employment-law.md',
    lastModified: '2024-01-30',
    category: {
      name: 'Germany',
      path: '/payroll/germany'
    }
  },
  {
    id: '5',
    title: 'Ireland Payroll Setup Guide',
    content: `# Ireland Payroll Setup Guide

A comprehensive guide to setting up and managing Irish payroll operations.

## PAYE Modernisation
The Irish PAYE system requires:
- Enhanced real-time reporting to Revenue
- Accurate employee data maintenance
- Digital submission of payroll data
- Regular payment reconciliation
- Monthly statement reviews
- New API integration requirements

## Employee Registration
Required steps for new employees:
- Obtain Personal Public Service (PPS) number
- Register employee with Revenue
- Set up Revenue Payroll Notification (RPN)
- Collect tax credit certificates
- Verify employment status
- Remote worker documentation

## Cross-Border Considerations
New guidelines for remote workers:
- Tax residency determination
- Social security obligations
- A1 certificate requirements
- Posted worker notifications
- Double taxation treaties

## Payroll Calculations
Key components of Irish payroll:
- Basic salary and additions
- PAYE (income tax)
- PRSI (social insurance)
- USC (universal social charge)
- Local Property Tax (if applicable)
- Pension contributions
- Remote work allowances

## Benefit Reporting
Taxable benefits must be reported:
- Company vehicles (new EV rates)
- Health insurance
- Share options
- Living accommodation
- Preferential loans
- Home office equipment

## Statutory Requirements
Legal obligations include:
- Updated minimum wage (€12.70/hour)
- Enhanced statutory leave entitlements
- Working time records
- Digital payslip requirements
- Record retention (6 years)
- Remote work policy documentation`,
    path: '/payroll/ireland/setup.md',
    lastModified: '2024-02-20',
    category: {
      name: 'Ireland',
      path: '/payroll/ireland'
    }
  },
  {
    id: '6',
    title: 'Canadian Payroll Compliance',
    content: `# Canadian Payroll Compliance

Essential guide to maintaining compliance with Canadian payroll regulations.

## Federal Requirements
Basic compliance needs:
- Business Number registration
- CRA Payroll Program Account
- Enhanced T4 reporting
- Digital ROE submissions
- Federal tax remittances
- Remote worker documentation

## Provincial Obligations
Additional requirements by province:
- Workers' compensation registration
- Health tax registration
- Parental insurance premiums
- Provincial tax calculations
- Territory-specific regulations
- New BC Employer Health Tax

## Digital Compliance
New electronic filing requirements:
- Mandatory e-filing thresholds
- CRA digital services
- Provincial portal integration
- Real-time payroll reporting
- Electronic records management

## Payroll Deductions
Mandatory deductions include:
- Federal income tax
- Provincial income tax
- Enhanced CPP contributions
- Updated EI premiums
- Union dues (if applicable)
- Climate Action Incentive

## Record Keeping
Required documentation:
- Employee information
- Hours worked
- Payment records
- Digital tax forms
- Vacation records
- Statutory holiday pay
- Benefits administration
- Remote work agreements

## Reporting Deadlines
Key dates and requirements:
- Monthly/quarterly remittances
- Year-end T4 submissions (earlier deadline)
- Real-time ROE filing
- Workers' comp reporting
- Health tax returns
- New provincial requirements`,
    path: '/payroll/canada/compliance.md',
    lastModified: '2024-02-10',
    category: {
      name: 'Canada',
      path: '/payroll/canada'
    }
  },
  {
    id: '7',
    title: 'Multi-Country Payroll Management',
    content: `# Multi-Country Payroll Management

A comprehensive guide to managing payroll across multiple countries effectively.

## Centralized vs. Decentralized
Key considerations for structure:
- Local compliance requirements
- Data consolidation needs
- Reporting complexity
- Cost efficiency
- Technology capabilities
- Team expertise

## Data Standardization
Essential elements:
- Common data formats
- Unified employee IDs
- Standardized job codes
- Consistent department structures
- Currency conversion protocols
- Benefit classification alignment

## Technology Integration
System requirements:
- Multi-currency support
- Multi-language capability
- Configurable tax engines
- Automated compliance updates
- Cross-border payment processing
- Consolidated reporting tools

## Compliance Management
Key focus areas:
- Local law monitoring
- Change management processes
- Documentation requirements
- Audit trail maintenance
- Risk assessment protocols
- Regular compliance reviews

## Reporting Framework
Standard reports include:
- Global headcount analysis
- Cost center allocation
- Benefits utilization
- Tax jurisdiction summary
- Compliance status tracking
- Exception reporting`,
    path: '/payroll/platform/multi-country-management.md',
    lastModified: '2024-01-25',
    category: {
      name: 'Platform',
      path: '/payroll/platform'
    }
  },
  {
    id: '8',
    title: 'Global Payroll Security Guidelines',
    content: `# Global Payroll Security Guidelines

Essential security practices for protecting global payroll data and operations.

## Data Protection Standards
Core requirements:
- Encryption at rest and in transit
- Access control systems
- Multi-factor authentication
- Regular security audits
- Incident response plans
- Data retention policies

## Cross-Border Data Transfer
Compliance requirements:
- GDPR considerations
- Data localization laws
- Privacy shield frameworks
- Consent management
- Transfer impact assessments
- Standard contractual clauses

## System Security
Key measures:
- Network segmentation
- Intrusion detection
- Vulnerability scanning
- Patch management
- Backup procedures
- Disaster recovery

## Access Management
Control mechanisms:
- Role-based access
- Approval workflows
- Activity monitoring
- Session management
- Password policies
- Regular access reviews

## Vendor Management
Security requirements:
- Due diligence processes
- Security certifications
- Service level agreements
- Incident reporting
- Regular assessments
- Termination procedures`,
    path: '/payroll/platform/security.md',
    lastModified: '2024-02-05',
    category: {
      name: 'Platform',
      path: '/payroll/platform'
    }
  },
  {
    id: '9',
    title: 'Payroll Data Integration Guide',
    content: '# Payroll Data Integration Guide\n\nHow to integrate with common HRIS systems...',
    path: '/payroll/platform/integration.md',
    lastModified: '2024-02-12',
    category: {
      name: 'Platform',
      path: '/payroll/platform'
    }
  },
  {
    id: '10',
    title: 'Global Payroll Reporting',
    content: '# Global Payroll Reporting\n\nStandardized reporting across countries...',
    path: '/payroll/platform/reporting.md',
    lastModified: '2024-01-20',
    category: {
      name: 'Platform',
      path: '/payroll/platform'
    }
  }
];

export const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Add more on classification in France',
    description: 'Expand the French classification guide with details about CDI vs CDD contracts, freelance status, and recent changes to consultant classification rules.',
    relatedArticles: ['2']
  },
  {
    id: '2',
    title: 'Add more on year-end in Australia',
    description: 'Talk about STP finalization and how to prepare for it',
    relatedArticles: ['1']
  },
  {
    id: '3', 
    title: 'Update funds flow documentation',
    description: 'Update funds flow documentation for Australia and France',
    relatedArticles: ['1', '2']
  }
];

export const mockEdits: Edit[] = [];

console.log('Mock Articles:', mockArticles.map(a => a.id))
console.log('Mock Edits:', mockEdits.map(e => e.articleId)) 