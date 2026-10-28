export type Project = {
  number: string
  title: string
  category: string
  summary: string
  detail: string
  tags: string[]
  repository: string
  visual: 'fashion' | 'floorplan'
}

export type PortfolioContent = {
  name: string
  shortName: string
  role: string
  location: string
  intro: string
  about: string[]
  focus: string[]
  projects: Project[]
  research: { heading: string; description: string; note: string }
  experience: { title: string; organization: string; description: string }[]
  teaching: { title: string; organization: string; description: string }
  skills: { label: string; items: string[] }[]
  links: { github: string; linkedin: string; email: string }
  cv: { href: string; label: string; note: string }
}

export const content: PortfolioContent = {
  name: 'Ali (Farzad) Jamali',
  shortName: 'Farzad Jamali',
  role: 'AI & Computer Vision Engineer',
  location: 'Manchester, UK',
  intro: 'I build practical AI systems that connect visual understanding, multimodal retrieval, and evidence you can inspect.',
  about: [
    'I work across computer vision, recommendation, document intelligence, and grounded AI. My projects move from data and models through evaluation and usable review tools.',
    'I am completing an MPhil in Computer Science & Artificial Intelligence at the University of Salford. My earlier background in mechanical engineering informs how I approach real-world systems.',
  ],
  focus: ['Computer vision', 'Multimodal retrieval', 'Evidence-grounded AI'],
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
    },
    {
      number: '02',
      title: 'Floor-plan document intelligence',
      category: 'Vision + OCR',
      summary: 'A pipeline that turns raster floor plans into five-class segmentation masks, OCR tokens, approximate polygons, and review-aware JSON.',
      detail: 'Uses SegFormer-B0, Tesseract, conservative spatial links, and a local inspection viewer. Geometry is approximate pixel-coordinate output, not CAD or BIM reconstruction.',
      tags: ['SegFormer', 'OCR', 'Geometry', 'Evaluation'],
      repository: 'https://github.com/farzadismyid/floor-plan-document-intelligence',
      visual: 'floorplan',
    },
  ],
  research: {
    heading: 'Multimodal recommendation & grounded explanations',
    description: 'My stated MPhil focus is multimodal recommendation and grounded AI explanations. The public fashion recommender repository shows the applied pipeline: retrieval, rule evidence, explanation generation, and support checks.',
    note: 'Publications and formal research outcomes will be added only after verification.',
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
    description: 'Teaching support is listed on my public GitHub profile. Course titles, dates, and responsibilities can be added after verification.',
  },
  skills: [
    { label: 'Vision & ML', items: ['PyTorch', 'OpenCV', 'SegFormer', 'CLIP', 'Image segmentation'] },
    { label: 'Retrieval & language', items: ['Multimodal embeddings', 'Semantic search', 'Reranking', 'OCR', 'Evidence grounding'] },
    { label: 'Engineering', items: ['Python', 'TypeScript', 'Reproducible evaluation', 'Streamlit', 'GitHub Actions'] },
  ],
  links: {
    github: 'https://github.com/alifarzadjamali',
    linkedin: 'https://www.linkedin.com/in/alifarzadjamali/',
    email: 'mailto:ali292jamali@gmail.com',
  },
  cv: {
    href: '/Ali_Jamali_CV.pdf',
    label: 'Download CV',
    note: 'View a concise record of research, projects, experience, and teaching.',
  },
}
