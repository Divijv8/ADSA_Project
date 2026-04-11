#include "trie.hpp"

#include <algorithm>

Trie::Trie() : root(std::make_unique<Node>()) {}

void Trie::insert(const std::string& word, int position, int lineNumber) {
  if (word.empty()) {
    return;
  }

  Node* node = root.get();
  for (char c : word) {
    auto it = node->children.find(c);
    if (it == node->children.end()) {
      node->children[c] = std::make_unique<Node>();
    }
    node = node->children[c].get();
  }

  node->isEnd = true;
  node->endCount += 1;
  if (node->firstPosition == -1 || position < node->firstPosition) {
    node->firstPosition = position;
  }
  node->lastSeenLine = std::max(node->lastSeenLine, lineNumber);
}

bool Trie::remove(const std::string& word) {
  return removeRecursive(root.get(), word, 0);
}

bool Trie::removeRecursive(Node* node, const std::string& word, int depth) {
  if (!node) {
    return false;
  }

  if (depth == static_cast<int>(word.size())) {
    if (!node->isEnd) {
      return false;
    }
    node->endCount = 0;
    node->isEnd = false;
    return node->children.empty();
  }

  const char c = word[depth];
  auto it = node->children.find(c);
  if (it == node->children.end()) {
    return false;
  }

  const bool shouldEraseChild = removeRecursive(it->second.get(), word, depth + 1);
  if (shouldEraseChild) {
    node->children.erase(c);
  }

  return !node->isEnd && node->children.empty();
}

std::vector<TrieResult> Trie::searchPrefix(const std::string& prefix, int limit) const {
  const Node* node = root.get();
  for (char c : prefix) {
    auto it = node->children.find(c);
    if (it == node->children.end()) {
      return {};
    }
    node = it->second.get();
  }

  std::vector<TrieResult> out;
  std::string current = prefix;
  collect(node, current, out, limit);
  return out;
}

void Trie::collect(const Node* node,
                   std::string& current,
                   std::vector<TrieResult>& out,
                   int limit) const {
  if (!node || static_cast<int>(out.size()) >= limit) {
    return;
  }

  if (node->isEnd && node->endCount > 0) {
    out.push_back({current, node->endCount, node->firstPosition, node->lastSeenLine});
  }

  std::vector<char> keys;
  keys.reserve(node->children.size());
  for (const auto& pair : node->children) {
    keys.push_back(pair.first);
  }
  std::sort(keys.begin(), keys.end());

  for (char c : keys) {
    current.push_back(c);
    collect(node->children.at(c).get(), current, out, limit);
    current.pop_back();
    if (static_cast<int>(out.size()) >= limit) {
      break;
    }
  }
}
