import re
import os.path
import itertools
from typing import List, Generator


class Tokenizer:
	def __init__(self) -> None:
		self.next = {}
		self.is_word = False

	# this function is created for efficiency purposes
	# Used for efficient sliding window approach to extract all words in a sentence
	def trail_depth(self, word_gen: Generator[str, None, None]) -> int:
		depth = 0
		max_depth = depth
		tmp = self
		for token in word_gen:
			if token not in tmp.next:
				return max_depth
		tmp = tmp.next[token]
		depth += 1
		max_depth = depth if tmp.is_word else max_depth

		return max_depth

	def extract_words(self, original: str) -> List[str]:
		sentences = [sentence for sentence in re.split('[!.?,]+', original)]
		words = []
		for sentence in sentences:
			tokens = [token for token in sentence.split(" ") if token != ""]
			if not tokens:
				continue
				
			i = 0
			while i < len(tokens):
				tmp = i
				while tmp < len(tokens) and tokens[tmp][0].isupper():
					tmp += 1
				if tmp != i:
					words.append(" ".join(tokens[i:tmp]))
				i = tmp
				if i == len(tokens):
					break

				word_gen = itertools.islice(tokens , i, len(tokens)) 
				depth = max(1, self.trail_depth(word_gen))
				words.append(" ".join(tokens[i:i+depth]))
				i += depth

		return words

	def has_word(self, word: str) -> bool:
		tokens = word.split(" ")
		tmp = self
		for token in tokens:
			if token not in tmp.next:
				return False
			tmp = tmp.next[token]

		return tmp.is_word

	def add_word(self, word: str) -> None:
		tokens = word.lower().split(" ")
		tmp = self
		for token in tokens:
			if token not in tmp.next:

				tmp.next[token] = self.__class__()
			tmp = tmp.next[token]
		tmp.is_word = True

words = []
with open(os.path.join(os.path.dirname(__file__), 'tokenizer_words.txt'), encoding="utf8") as f:
    words = f.read().split("\n")

Tokenizer = Tokenizer()

for word in words:
    Tokenizer.add_word(word)

def tokenize_text(text):
    return " ".join([word for word in text.split() if Tokenizer.has_word(word)])
