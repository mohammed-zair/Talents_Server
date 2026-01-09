
from weasyprint import HTML 
from jinja2 import Template 
import tempfile 

class TemplateService :
    def __init__ (self ):
        self .templates ={
        "modern_arabic":"templates/modern_arabic.html",
        "professional_english":"templates/professional_english.html",
        "ats_friendly":"templates/ats_friendly.html"
        }

    async def export_to_pdf (self ,cv_data ,template_name ="modern_arabic"):


        with open (self .templates [template_name ],"r",encoding ="utf-8")as f :
            template_content =f .read ()


        template =Template (template_content )
        html_content =template .render (**cv_data )


        pdf_file =tempfile .NamedTemporaryFile (delete =False ,suffix =".pdf")
        HTML (string =html_content ).write_pdf (pdf_file .name )

        return pdf_file .name 