const db = require('../config/db.config');

// Lấy thông tin hồ sơ người dùng / sinh viên thực hiện đề tài
const getUserProfile = async (req, res, next) => {
  try {
    const queryText = `
      SELECT id, username, full_name,
             to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
      FROM users
      WHERE username = 'B23DCCN633'
      LIMIT 1;
    `;

    const { rows } = await db.query(queryText);

    const user = rows.length > 0 ? rows[0] : { id: 1, username: 'B23DCCN633', full_name: 'Đỗ Trọng Ninh' };

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        student_id: 'B23DCCN633',
        major: 'Công nghệ Thông tin',
        class: 'D23CQCN01-B',
        group: 'Nhóm 10 - Môn IoT và Ứng dụng',
        supervisor: 'Nguyễn Quốc Uy',
        created_at: user.created_at || new Date().toISOString()
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUserProfile
};
