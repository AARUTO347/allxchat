#pragma once

/**
 * AARUESP Board Registry - 200+ Board Support
 * By AARUTO (2026)
 *
 * Declares the board database and lookup functions.
 * The board definitions themselves live in BoardRegistry.cpp.
 */

#include "AARUESP.h"

/**
 * @brief Get pointer to null-terminated array of all supported boards.
 * @return BoardInfo array (nullptr terminated) or nullptr if empty
 */
const BoardInfo* aruGetAllBoards();

/**
 * @brief Get the number of supported boards
 * @return Number of boards in the registry
 */
const size_t aruGetBoardCount();

/**
 * @brief Find a board by its registry name (case-insensitive fallback)
 * @param name Board name to search (e.g. "ESP32_WROOM_32")
 * @return BoardInfo pointer or nullptr if not found
 */
const BoardInfo* aruFindBoard(const char* name);

/**
 * @brief List all board names
 * @return Vector of board name strings
 */
std::vector<std::string> aruListBoards();