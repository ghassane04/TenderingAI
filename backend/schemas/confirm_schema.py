from pydantic import BaseModel
from typing import List

class ConfirmProductRequest(BaseModel):
    supplier_product_id: int
    chosen_product_id: int


class ConfirmProductResponse(BaseModel):
    success: bool
    message: str