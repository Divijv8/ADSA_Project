#include "segment_tree.hpp"

#include <algorithm>

SegmentTree::SegmentTree(const std::vector<int>& values) : n(static_cast<int>(values.size())) {
  tree.assign(4 * std::max(1, n), 0);
  if (n > 0) {
    build(values, 1, 0, n - 1);
  }
}

void SegmentTree::build(const std::vector<int>& values, int node, int start, int end) {
  if (start == end) {
    tree[node] = values[start];
    return;
  }

  const int mid = start + (end - start) / 2;
  build(values, 2 * node, start, mid);
  build(values, 2 * node + 1, mid + 1, end);
  tree[node] = tree[2 * node] + tree[2 * node + 1];
}

int SegmentTree::query(int left, int right) const {
  if (n == 0 || left > right || left < 0 || right >= n) {
    return 0;
  }
  return queryInternal(1, 0, n - 1, left, right);
}

int SegmentTree::queryInternal(int node, int start, int end, int left, int right) const {
  if (right < start || end < left) {
    return 0;
  }

  if (left <= start && end <= right) {
    return tree[node];
  }

  const int mid = start + (end - start) / 2;
  const int leftSum = queryInternal(2 * node, start, mid, left, right);
  const int rightSum = queryInternal(2 * node + 1, mid + 1, end, left, right);
  return leftSum + rightSum;
}

void SegmentTree::update(int index, int value) {
  if (index < 0 || index >= n) {
    return;
  }
  updateInternal(1, 0, n - 1, index, value);
}

void SegmentTree::updateInternal(int node, int start, int end, int index, int value) {
  if (start == end) {
    tree[node] = value;
    return;
  }

  const int mid = start + (end - start) / 2;
  if (index <= mid) {
    updateInternal(2 * node, start, mid, index, value);
  } else {
    updateInternal(2 * node + 1, mid + 1, end, index, value);
  }

  tree[node] = tree[2 * node] + tree[2 * node + 1];
}
