export interface CVData {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;

  skills: string[];

  experiences: {
    company: string;
    position: string;
    period: string;
    description: string;
  }[];

  education: {
    school: string;
    degree: string;
    year: string;
  }[];
}