export type Project = {
  number: string
  title: string
  category: string
  summary: string
  detail: string
  tags: string[]
  repository: string
  visual: 'fashion' | 'floorplan' | 'fabric' | 'benchmark'
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
    "I'm Ali Jamali, but everyone calls me Farzad. You may also know me as Farzad Jamali. I work across computer vision, recommendation, document intelligence, and grounded AI. My projects move from data and models through evaluation and usable review tools.",
    'I am completing an MPhil in Computer Science & Artificial Intelligence at the University of Salford. My earlier background in mechanical engineering informs how I approach real-world systems.',
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
      detail: 'The repository includes evidence traces, claim-support checks, and paired evaluation of recommendation and explanation variants. Its rule set has finite coverage and automated support labels need human validation.',
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
      detail: 'Uses SegFormer-B0, Tesseract, conservative spatial links, and a local inspection viewer. Geometry is approximate pixel-coordinate output, not CAD or BIM reconstruction.',
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
      detail: 'A U-Net with a ResNet-18 encoder produces defect probability maps, with overlapping inference and evaluation on a locked holdout. The system remains a research prototype.',
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
      tags: ['CLIP', 'Representation learning', 'PCA', 'Evaluation'], repository: 'https://github.com/alifarzadjamali/fashion-compatibility-benchmark', visual: 'benchmark',
      stages: [
        { label: 'Extract', description: 'Extract features from frozen image representations.' },
        { label: 'Train', description: 'Fit preprocessing and a classifier using training data.' },
        { label: 'Compare', description: 'Evaluate outfit compatibility and fill-in-the-blank completion.' },
      ],
    },
  ],
  research: {
    heading: 'Multimodal recommendation & grounded explanations',
    description: 'My MPhil research focuses on multimodal recommendation and grounded AI explanations. The public fashion recommender repository shows the applied pipeline: retrieval, rule evidence, explanation generation, and support checks.',
    note: 'Publications are listed on Google Scholar',
  },
  experience: [
    {
      title: 'Independent applied AI projects',
      organization: 'Selected public repositories',
      description: 'End-to-end experiments and prototypes in recommendation, computer vision, and document intelligence. Project repositories document scope, methods, and limitations.',
    },
  ],
  teaching: {
    title: 'Deep Learning teaching support',
    organization: 'University of Salford',
    description: 'Teaching support for Deep Learning at the University of Salford.',
  },
  skills: [
    { label: 'Vision & ML', items: ['PyTorch', 'OpenCV', 'SegFormer', 'CLIP', 'Image segmentation'] },
    { label: 'Retrieval & language', items: ['Multimodal embeddings', 'Semantic search', 'Reranking', 'OCR', 'Evidence grounding'] },
    { label: 'Engineering', items: ['Python', 'TypeScript', 'Reproducible evaluation', 'Streamlit', 'GitHub Actions'] },
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
