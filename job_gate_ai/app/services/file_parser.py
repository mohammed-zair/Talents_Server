
import os 
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

        return text .strip ()

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

        return text .strip ()

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

            if "pdf"in file_type .lower ():
                return await self .parse_pdf (temp_path )
            elif "docx"in file_type .lower ():
                return await self .parse_docx (temp_path )
            else :
                raise ValueError (f"Unsupported file type: {file_type }")
        finally :

            if temp_file and os .path .exists (temp_file .name ):
                try :
                    os .unlink (temp_file .name )
                except :
                    pass 