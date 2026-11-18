export type Project = {
  number: string
  title: string
  category: string
  summary: string
  detail: string
  results: string
  limitations: string
  image?: string
  imageWidth?: number
  imageHeight?: number
  tags: string[]
  repository: string
  visual: 'fashion' | 'floorplan' | 'fabric' | 'benchmark' | 'language'
  stages: { label: string; description: string }[]
}

export type PortfolioContent = {
  name: string
  emailAddress: string
  shortName: string
  role: string
  location: string
  intro: string
  about: string[]
  focus: { label: string; href: string }[]
  projects: Project[]
  research: { heading: string; description: string; note: string }
  experience: { title: string; organization: string; description: string }[]
  education: { title: string; organization: string; dates: string }[]
  teaching: { title: string; organization: string; description: string }
  skills: { label: string; items: string[] }[]
  links: { github: string; linkedin: string; googleScholar: string; orcid: string; email: string }
  cv: { href: string; label: string; note: string }
}

const emailAddress = 'ali292jamali@gmail.com'

export const content: PortfolioContent = {
  name: 'Ali (Farzad) Jamali',
  emailAddress,
  shortName: 'Farzad Jamali',
  role: 'AI & Computer Vision Engineer',
  location: 'Manchester, UK',
  intro: 'I build practical AI systems that connect visual understanding, multimodal retrieval, and evidence you can inspect.',
  about: [
    "I'm Ali Jamali, but everyone calls me Farzad, so you'll often see me as Farzad Jamali. I work across computer vision, recommendation, document intelligence, and grounded AI. My projects move from data and models through evaluation and usable review tools.",
    'I am an MPhil researcher in Computer Science & Artificial Intelligence at the University of Salford and hold an MPhil. My earlier background in mechanical engineering informs how I approach real-world systems.',
  ],
  focus: [
    { label: 'Computer vision', href: '#project-02' },
    { label: 'Multimodal retrieval', href: '#project-01' },
    { label: 'Evidence-grounded AI', href: '#research' },
  ],
  projects: [
    {
      number: '01',
      title: 'Evidence-based fashion recommender',
      category: 'Multimodal recommendation',
      summary: 'Image and product-text embeddings retrieve fashion items; source-linked styling rules rerank results and support generated explanations.',
      detail: 'The repository includes evidence traces, claim-support checks, and paired evaluation of recommendation and explanation variants.',
      results: 'Across 1,000 test cases, supplying the exact rule trace raised trace-supported claims by 21 percentage points (95% CI 19.7 to 22.4); reranking did not improve retrieval metrics.',
      limitations: 'The rule set has finite coverage, and automated support labels need human validation.',
      tags: ['CLIP', 'Retrieval', 'Reranking', 'Grounded explanations'],
      repository: 'https://github.com/alifarzadjamali/evidence-based-fashion-recommender',
      visual: 'fashion',
      stages: [
        { label: 'Retrieve', description: 'Match product images and text with multimodal embeddings.' },
        { label: 'Rerank', description: 'Apply source-linked styling rules to the candidate set.' },
        { label: 'Explain', description: 'Generate explanations and check their support against evidence.' },
      ],
    },
    {
      number: '02',
      title: 'Floor-plan document intelligence',
      category: 'Vision + OCR',
      summary: 'A pipeline that turns raster floor plans into five-class segmentation masks, OCR tokens, approximate polygons, and review-aware JSON.',
      detail: 'Uses SegFormer-B0, Tesseract, conservative spatial links, and a local inspection viewer.',
      results: 'Five-class mIoU rose from 0.312 for the classical baseline to 0.577 on held-out data.',
      limitations: 'Geometry is approximate pixel-coordinate output, not CAD or BIM reconstruction.',
      image: '/projects/floor-plan-document-intelligence/result.webp', imageWidth: 2128, imageHeight: 582,
      tags: ['SegFormer', 'OCR', 'Geometry', 'Evaluation'],
      repository: 'https://github.com/alifarzadjamali/floor-plan-document-intelligence',
      visual: 'floorplan',
      stages: [
        { label: 'Segment', description: 'Predict five classes from a raster floor plan.' },
        { label: 'Read', description: 'Extract text tokens with OCR and conservative spatial links.' },
        { label: 'Review', description: 'Inspect approximate polygons and JSON before use.' },
      ],
    },
    {
      number: '03', title: 'Industrial Fabric Defect Inspection', category: 'Computer vision',
      summary: 'A fabric inspection prototype that identifies defects in woven fabric and marks affected pixels.',
      detail: 'A U-Net with a ResNet-18 encoder produces defect probability maps, with overlapping inference and evaluation on a locked holdout.',
      results: 'On a locked holdout, Dice rose from 0.259 to 0.532 and image-level ROC-AUC reached 0.878.',
      limitations: 'The system remains a research prototype, with missed defects and false alarms.',
      image: '/projects/industrial-fabric-defect-inspection/result.webp', imageWidth: 2200, imageHeight: 753,
      tags: ['U-Net', 'ResNet-18', 'Segmentation', 'AITEX'], repository: 'https://github.com/alifarzadjamali/industrial-fabric-defect-inspection', visual: 'fabric',
      stages: [
        { label: 'Prepare', description: 'Split source images and prepare fabric crops and masks.' },
        { label: 'Inspect', description: 'Predict pixel-level defect probabilities with a U-Net.' },
        { label: 'Evaluate', description: 'Assess segmentation and image-level detection on a locked holdout.' },
      ],
    },
    {
      number: '04', title: 'Fashion Compatibility Benchmark', category: 'Representation learning',
      summary: 'A benchmark comparing frozen image representations for outfit compatibility prediction and fill-in-the-blank completion.',
      detail: 'The comparison uses shared train-only preprocessing, PCA, symmetric pair features, and a logistic classifier across image representations.',
      results: 'On Polyvore, contrastive vision-language models reached approximately 0.89 ROC-AUC compared with 0.69 for ResNet50.',
      limitations: 'Fashion-specialised models were not consistently better; checkpoint comparisons do not isolate training data, architecture, or loss.',
      tags: ['CLIP', 'Representation learning', 'PCA', 'Evaluation'], repository: 'https://github.com/alifarzadjamali/fashion-compatibility-benchmark', visual: 'benchmark',
      stages: [
        { label: 'Extract', description: 'Extract features from frozen image representations.' },
        { label: 'Train', description: 'Fit preprocessing and a classifier using training data.' },
        { label: 'Compare', description: 'Evaluate outfit compatibility and fill-in-the-blank completion.' },
      ],
    },
    {
      number: '05', title: 'LLM Output Homogenization', category: 'Language model evaluation',
      summary: 'A study of diversity and similarity in human and language-model responses across several tasks.',
      detail: 'The study uses text embeddings, semantic similarity, diversity metrics, and statistical comparisons to examine generated responses.',
      results: 'The clearest human diversity advantage appeared on ESConv and WritingPromptsX; results on physical-reasoning datasets were mixed.',
      limitations: 'Results depend on the embedding model; the current reproduction code does not recreate every part of the published report.',
      tags: ['LLM evaluation', 'Embeddings', 'Semantic similarity', 'Python'], repository: 'https://github.com/alifarzadjamali/LLM-output-homogenization', visual: 'language',
      stages: [
        { label: 'Prepare', description: 'Sample prompts and responses from multiple datasets.' },
        { label: 'Embed', description: 'Represent responses with text embeddings.' },
        { label: 'Compare', description: 'Measure diversity and similarity with statistical checks.' },
      ],
    },
  ],
  research: {
    heading: 'Multimodal recommendation & grounded explanations',
    description: 'My MPhil research focuses on multimodal recommendation and grounded AI explanations. The public fashion recommender repository shows the applied pipeline: retrieval, rule evidence, explanation generation, and support checks.',
    note: 'Full list on Google Scholar',
  },
  experience: [
    { title: 'Recommendation & Analytics Platform', organization: 'World Privilege Plus · 2025–2026', description: 'Independently built a deep learning based, semantic-aware recommendation and analytics platform for a rewards business with over 4 million members. Used Python and FastAPI for data processing, model training and real-time predictions, with DuckDB and Parquet for analytics.' },
    { title: 'Data Analyst', organization: 'Nilper · Sep 2023–Sep 2025', description: 'Analysed sales, product and quality data and built dashboards for operational decisions.' },
    { title: 'Data Analyst', organization: 'Solico Group · Sep 2021–Mar 2023', description: 'Automated KPI reports and analysed consumer, campaign and product category data.' },
    { title: 'Mechanical Engineer', organization: 'Padideh Sanat Ouj Co. · 2019', description: 'Designed and analysed components for hydrotest and hydroforming equipment.' },
    { title: 'Mechanical Design & Simulation Intern', organization: 'SAIPA Corp. · 2014', description: 'Produced manufacturing drawings for jigs and fixtures and assisted with mechanical design and simulation.' },
  ],
  education: [
    { title: 'MPhil, Computer Science & Artificial Intelligence', organization: 'University of Salford', dates: 'MPhil awarded · MPhil researcher' },
    { title: 'MSc, Mechanical Engineering — Dynamics, Control & Vibrations', organization: 'Shahid Beheshti University', dates: '2016–2019' },
    { title: 'BSc, Mechanical Engineering', organization: 'Semnan University', dates: '2012–2016' },
  ],
  teaching: {
    title: 'Hourly Paid Academic — Deep Learning',
    organization: 'University of Salford',
    description: 'Run Deep Learning workshops for undergraduate and postgraduate students and supervise their work. Help them write and debug code in Python, TensorFlow and PyTorch.',
  },
  skills: [
    { label: 'Computer vision & ML', items: ['PyTorch', 'OpenCV', 'Segmentation', 'OCR', 'Transfer learning', 'Statistical evaluation'] },
    { label: 'Language & retrieval', items: ['CLIP', 'SigLIP2', 'Multimodal embeddings', 'RAG', 'Evidence grounding', 'LLM evaluation'] },
    { label: 'Software & engineering', items: ['Python', 'SQL', 'FastAPI', 'Docker', 'Streamlit', 'SolidWorks', 'CATIA', 'MATLAB'] },
  ],
  links: {
    github: 'https://github.com/alifarzadjamali',
    linkedin: 'https://www.linkedin.com/in/alifarzadjamali/',
    googleScholar: 'https://scholar.google.com/citations?user=xd6LP18AAAAJ',
    orcid: 'https://orcid.org/0009-0001-0678-4155',
    email: `mailto:${emailAddress}`,
  },
  cv: {
    href: '/Ali_Jamali_CV.pdf',
    label: 'Download CV',
    note: 'View a concise record of research, projects, experience, and teaching.',
  },
}
