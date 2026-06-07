import random
import logging
logger = logging.getLogger(__name__)


#-----------------secret---------------------------------------------------------------------------------------------------

def get_secret_word() -> str:
    logger.info("Tool called: get_secret_word()")
    return random.choice(["Dawoooood", "Amrooooo", "AI Agenttttt"])