import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SECRET_KEY")
supabase: Client = create_client(url, key)

# BASIC DB FUNCTIONS
def init_user_info(wallet: str) :
    user_info = {
        "wallet": wallet,
        "practice_sent": 0,
        "practice_received": 0,
        "completed_theory": False,
        "completed_practice": False,
        "completed_security": False,
        "completed_all": False,
        "claimed_nft": False
    }
    response = supabase.table("USER_INFO").insert(user_info).execute()
    return response.data

def init_user_progress(wallet: str) :
    user_progress = {
        "wallet": wallet,
        "faucet": False,
        "send": False,
        "receive": False,
        "mint": False,
        "launch": False,
        "lab1": False,
        "lab2": False,
        "lab3": False,
        "lab4": False,
        "lab5": False,
        "theory1": False,
        "theory2": False,
        "theory3": False,
        "theory4": False,
        "theory5": False
    }
    response = supabase.table("USER_PROGRESS").insert(user_progress).execute()
    return response.data

def get_user_info(wallet: str):
    response = (
        supabase.table("USER_INFO").select("*").eq("wallet", wallet)
        .maybe_single()  # returns Dict / None
        .execute()
    )
    return response.data

def get_user_progress(wallet: str):
    response = (
        supabase.table("USER_PROGRESS").select("*").eq("wallet", wallet).maybe_single().execute()
    )
    return response.data

def get_field(table_name: str, field_name: str, wallet: str):
    response = (
        supabase.table(table_name)
        .select(field_name).eq("wallet", wallet).maybe_single() .execute()
    )
    row = response.data
    if row is None:
        return None
    return row[field_name]

def update_field(table_name: str, field_name: str, wallet: str, value):
    try:
        response = (
            supabase.table(table_name).update({field_name: value}).eq("wallet", wallet).execute()
        )
        return response.data
    except Exception as e :
        return None
# SOPHISTICATED DB FUNCTIONS
#returns: ([{'wallet': 'test_user', 'id': 18, 'created_at': '2025-12-20T20:16:41.898289+00:00', 'practice_sent': 0, 'practice_received': 0, 'completed_all': False, 'completed_theory': False, 'completed_practice': False}], [{'id': 11, 'wallet': 'test_user', 'created_at': '2025-12-20T20:16:41.997225+00:00', 'theory': False, 'faucet': False, 'send': False, 'receive': False, 'mint': False, 'launch': False}])
def add_user(wallet: str) :
    try:
        row_info = init_user_info(wallet)
        row_progress = init_user_progress(wallet)
        return row_info, row_progress

    except Exception as e :
        return e

#returns: ({'wallet': 'test_user', 'id': 18, 'created_at': '2025-12-20T20:16:41.898289+00:00', 'practice_sent': 0, 'practice_received': 0, 'completed_all': False, 'completed_theory': False, 'completed_practice': False}, {'id': 11, 'wallet': 'test_user', 'created_at': '2025-12-20T20:16:41.997225+00:00', 'theory': False, 'faucet': False, 'send': False, 'receive': False, 'mint': False, 'launch': False})
def get_user(wallet: str):
    try:
        info = get_user_info(wallet)
        progress = get_user_progress(wallet)
        return info, progress
    except Exception as e :
        return None

#returns: {'progress_deleted': [{'id': 11, 'wallet': 'test_user', 'created_at': '2025-12-20T20:16:41.997225+00:00', 'theory': False, 'faucet': False, 'send': False, 'receive': False, 'mint': False, 'launch': False}], 'info_deleted': [{'wallet': 'test_user', 'id': 18, 'created_at': '2025-12-20T20:16:41.898289+00:00', 'practice_sent': 0, 'practice_received': 0, 'completed_all': False, 'completed_theory': False, 'completed_practice': False}]}
def delete_user(wallet: str) :
    try:
        prog_resp = (
            supabase.table("USER_PROGRESS")
            .delete().eq("wallet", wallet).execute()
        )
        info_resp = (
            supabase.table("USER_INFO")
            .delete().eq("wallet", wallet).execute()
        )

        return {
            "progress_deleted": prog_resp.data,
            "info_deleted": info_resp.data,
        }
    except Exception as e :
        return None

def check_completion(wallet: str):
    try:
        info, progress = get_user(wallet)
        if not info["completed_practice"]:
            if progress["faucet"] and progress["send"] and progress["receive"] and progress["mint"] and progress["launch"]:
                update_field("USER_INFO", "completed_practice", wallet, True)
                info["completed_practice"] = True

        if not info["completed_security"]:
            if progress["lab1"] and progress["lab2"] and progress["lab3"] and progress["lab4"] and progress["lab5"]:
                update_field("USER_INFO", "completed_security", wallet, True)
                info["completed_security"] = True

        if not info["completed_theory"]:
            if progress["theory1"] and progress["theory2"] and progress["theory3"] and progress["theory4"] and progress["theory5"]:
                update_field("USER_INFO", "completed_theory", wallet, True)
                info["completed_theory"] = True

        if not info["completed_all"] and info["completed_practice"] and info["completed_theory"] and info["completed_security"]:
             update_field("USER_INFO", "completed_all", wallet, True)

        return True

    except Exception as e:
        return None