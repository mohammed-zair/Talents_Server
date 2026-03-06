
import os 
import re
import tempfile 
from typing import Optional 

try :
    import PyPDF2 
    PDF_AVAILABLE =True 
except ImportError :
    PDF_AVAILABLE =False 
    print ("Warning: PyPDF2 not available, PDF parsing disabled")

try :
    from docx import Document 
    DOCX_AVAILABLE =True 
except ImportError :
    DOCX_AVAILABLE =False 
    print ("Warning: python-docx not available, DOCX parsing disabled")

class FileParserService :
    def __init__ (self ):
        self .allowed_types =["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]

    async def parse_pdf (self ,file_path :str )->str :
        """Extract text from PDF file using PyPDF2"""
        if not PDF_AVAILABLE :
            raise ImportError ("PyPDF2 is not installed. Install with: pip install PyPDF2")

        text =""
        try :
            with open (file_path ,'rb')as file :
                pdf_reader =PyPDF2 .PdfReader (file )
                for page_num ,page in enumerate (pdf_reader .pages ):
                    try :
                        page_text =page .extract_text ()
                        if page_text :
                            text +=page_text +"\n"
                    except Exception as page_error :
                        print (f"Warning: Error extracting text from page {page_num }: {page_error }")
                        continue 
        except Exception as e :
            print (f"PDF parsing error: {e }")
            raise 

        return self._clean_extracted_text(text)

    async def parse_docx (self ,file_path :str )->str :
        """Extract text from DOCX file"""
        if not DOCX_AVAILABLE :
            raise ImportError ("python-docx is not installed. Install with: pip install python-docx")

        try :
            doc =Document (file_path )
            paragraphs =[]
            for paragraph in doc .paragraphs :
                if paragraph .text .strip ():
                    paragraphs .append (paragraph .text )
            text ="\n".join (paragraphs )
        except Exception as e :
            print (f"DOCX parsing error: {e }")
            raise 

        return self._clean_extracted_text(text)

    def _repair_split_letters(self, line: str) -> str:
        if not line:
            return line

        out = line

        # Collapse sequences like "H T M L" -> "HTML"
        out = re.sub(r"\b(?:[A-Za-z]\s+){2,}[A-Za-z]\b", lambda m: m.group(0).replace(" ", ""), out)

        # Collapse words split by single-letter gaps like "pr ojects" -> "projects"
        # Repeat to catch multi-gap words such as "de v elopment".
        for _ in range(4):
            new_out = re.sub(r"\b([A-Za-z]{2,})\s+([A-Za-z])\s+([A-Za-z]{2,})\b", r"\1\2\3", out)
            if new_out == out:
                break
            out = new_out

        # Fix prefix/suffix one-letter splits: "T ailwind" / "nativ e"
        out = re.sub(r"\b([A-Za-z])\s+([A-Za-z]{2,})\b", r"\1\2", out)
        out = re.sub(r"\b([A-Za-z]{2,})\s+([A-Za-z])\b", r"\1\2", out)

        return out

    def _clean_extracted_text(self, text: str) -> str:
        if not text:
            return ""

        cleaned = (
            text.replace("\u200f", " ")
            .replace("\u200e", " ")
            .replace("\u200b", "")
            .replace("\ufeff", "")
            .replace("\t", " ")
        )

        normalized_lines = []
        for raw_line in cleaned.splitlines():
            line = re.sub(r"\s+", " ", raw_line).strip()
            if not line:
                continue
            line = self._repair_split_letters(line)
            normalized_lines.append(line)

        return "\n".join(normalized_lines).strip()

    async def parse_file (self ,file_content :bytes ,file_type :str )->Optional [str ]:
        """Parse PDF or DOCX file and extract text"""
        if not file_content :
            return None 


        suffix =".pdf"if "pdf"in file_type .lower ()else ".docx"
        temp_file =None 
        try :
            with tempfile .NamedTemporaryFile (delete =False ,suffix =suffix ,mode ='wb')as temp_file :
                temp_file .write (file_content )
                temp_path =temp_file .name 

            file_type_lower = (file_type or "").lower()
            is_pdf = "pdf" in file_type_lower
            is_docx = (
                "docx" in file_type_lower
                or "wordprocessingml.document" in file_type_lower
                or "officedocument.wordprocessingml.document" in file_type_lower
            )

            if is_pdf:
                return await self .parse_pdf (temp_path )
            elif is_docx:
                return await self .parse_docx (temp_path )
            else :
                raise ValueError (f"Unsupported file type: {file_type }")
        finally :

            if temp_file and os .path .exists (temp_file .name ):
                try :
                    os .unlink (temp_file .name )
                except :
                    pass 
