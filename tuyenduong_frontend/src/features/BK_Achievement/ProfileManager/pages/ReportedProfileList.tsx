import {
  CCard,
  CCardBody,
  CCol,
  CDataTable,
  CPagination,
  CTooltip,
  CRow,
  CSelect,
  CButton,
  CCardHeader,
} from "@coreui/react";
import "moment/locale/vi";
import React, { useEffect, useState } from "react";
import achievementApi from "../../../../api/Achievement/achievementApi";
import { RouteComponentProps, useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../../store";
import { roles } from "../../../../common/roles";
import InputSearch from "../../../../common/InputFilterSearch";
import CIcon from "@coreui/icons-react";
import { freeSet } from "@coreui/icons";
import { CSVLink } from "react-csv";
import UserApi from "../../../../api/Achievement/userApi";
import AuditorApi from "../../../../api/Achievement/auditorApi";
import FormUpdateProfile from "../components/formUpdateProfile";
import moment from "moment";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import fileSaver from "file-saver";
import Criteria from "../../../../types/Criteria";
import Achievement from "../../../../types/Achievement";

const fields = [
  {
    key: "stt",
    label: "STT",
    _style: { textAlign: "center" },
  },
  {
    key: "mssv",
    label: "Mã số sinh viên",
    _style: { textAlign: "center" },
  },
  {
    key: "name",
    label: "Họ và tên",
    sorter: false,
    filter: false,
    _style: { textAlign: "center" },
  },
  {
    key: "email",
    label: "Email",
    _style: { width: "15%", textAlign: "center" },
  },
  {
    key: "department",
    label: "Đơn vị",
    _style: { width: "20%", textAlign: "center" },
  },
  {
    key: "result",
    label: "Kết quả",
    _style: { textAlign: "center" },
  },
  {
    key: "action",
    label: "Thao tác",
    _style: { width: "15%", textAlign: "center" },
    sorter: false,
    filter: false,
  },
];

const headers = [
  { label: "Mã số sinh viên", key: "mssv" },
  { label: "Họ và đệm", key: "surname" },
  { label: "Tên", key: "name" },
  { label: "Email", key: "email" },
  { label: "Đơn vị", key: "department" },
  { label: "Tình trạng", key: "result" },
];

interface TParam {
  id: string;
}

interface Filters {
  limit: number;
  page: number;
  search: string;
}

const ReportedProfile = ({ match }: RouteComponentProps<TParam>) => {
  const achievementId = parseInt(match.params.id);
  const [achievement, setAchievement] = useState<Achievement>({});
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(1);
  const [statistic, setStatistic] = useState<any>({});
  const [departmentId, setDepartmentId] = useState<any>(-1);
  const [idProfile, setIdProfile] = useState(-1);
  const [dataCSV, setDataCSV] = useState<any[]>([]);
  const [filters, setFilters] = useState<Filters>({
    limit: 10,
    page: 1,
    search: "",
  });
  const history = useHistory();
  const currentUser = useSelector((state: RootState) => state.user);
  const [modal, setModal] = useState({
    open: false,
    value: {
      id: 0,
      isVerified: false,
      idAchievement: 0,
    },
  });

  useEffect(() => {
    async function getStatisticDepartment() {
      const statistic = await achievementApi.getStatisticDepartment(
        achievementId,
        departmentId
      );
      setStatistic(statistic);
    }
    getStatisticDepartment();
  }, [departmentId, achievementId]);

  useEffect(() => {
    async function getAchievement(id: number) {
      const response = await achievementApi.get(id);
      setAchievement(response);
    }
    getAchievement(achievementId);
  }, [achievementId]);

  useEffect(() => {
    async function getDepartmentId() {
      const user = await UserApi.get(currentUser.id);
      if (user) {
        setDepartmentId(user.department.id);
      }
    }
    getDepartmentId();
  }, [currentUser.id]);

  useEffect(() => {
    achievementApi
      .getUserSubmissionToExport(achievementId, {
        limit: 9999,
        page: 1,
        search: "",
      })
      .then(({ data }) => {
        setDataCSV(
          data.map((user: any) => ({
            ...user,
            result:
              user.result === 2
                ? "Đạt"
                : user.result === 1
                ? "Cần bổ sung hồ sơ"
                : user.result === 0
                ? "Không đạt"
                : "Hồ sơ chưa duyệt",
          }))
        );
      })
      .catch((error: any) => {
        console.error(error.message);
        history.push("/loi-truy-cap");
      });
  }, [achievementId, history]);

  useEffect(() => {
    const verifyLogin = async () => {
      try {
        await UserApi.verifyLogin();
      } catch {
        history.push("/login");
      }
    };
    async function getUserSubmission(id: number) {
      try {
        const { data, count } = await achievementApi.getUserSubmissionToExport(
          id,
          filters
        );
        setCount(count);
        setData(data);
      } catch (error: any) {
        console.error(error.message);
        history.push("/loi-truy-cap");
      }
    }
    if ([roles.DEPARTMENT].includes(currentUser.role)) {
      getUserSubmission(achievementId);
    } else {
      verifyLogin();
      if (currentUser.id !== 0) {
        history.push("/loi-truy-cap");
      }
    }
  }, [achievementId, currentUser.role, currentUser.id, history, filters]);

  useEffect(() => {
    function exportReport(result: any, info: any) {
      const defaultText =
        "Người nộp không đạt hoặc không cung cấp thông tin ở mục này.";
      const listOfRootCriteria: Criteria[] = result.criterias.filter(
        (x: any) => x.isRoot
      );
      const listOfParagraph: any[] = [];
      // Generate title

      listOfParagraph.push(
        new Paragraph({
          style: "titleStyle",
          text: "BẢN GIỚI THIỆU THÀNH TÍCH ĐỀ CỬ GIẢI THƯỞNG",
        })
      );

      listOfParagraph.push(
        new Paragraph({
          style: "titleStyle",
          text: achievement.name?.concat().toUpperCase(),
        })
      );

      listOfParagraph.push(
        new Paragraph({
          style: "timeParagraphStyle",
          text: `Tp. Hồ Chí Minh, ngày ${moment().format(
            "DD"
          )} tháng ${moment().format("MM")} năm ${moment().format("YYYY")}`,
        })
      );

      // Generate info
      listOfParagraph.push(
        new Paragraph({
          text: "I. LÝ LỊCH TRÍCH NGANG:",
          style: "boldStyle",
        })
      );

      listOfParagraph.push(
        new Paragraph({
          style: "infoParagraphStyle",
          children: [
            new TextRun({
              text: "Họ và tên: ",
            }),
            new TextRun({
              text: `${info.surName} ${info.name}`.concat().toUpperCase(),
              style: "cboldStyle",
            }),
          ],
        })
      );

      listOfParagraph.push(
        new Paragraph({
          style: "infoParagraphStyle",
          children: [
            new TextRun({
              text: "Ngày sinh: ",
            }),
            new TextRun({
              text: moment(info.contactInfoId.birthday).format("DD/MM/YYYY"),
              style: "cboldStyle",
            }),
            new TextRun({
              text: "\t\tGiới tính: ",
            }),
            new TextRun({
              text: info.contactInfoId.gender === "Male" ? "Nam" : "Nữ",
              style: "cboldStyle",
            }),
          ],
        })
      );

      listOfParagraph.push(
        new Paragraph({
          style: "infoParagraphStyle",
          children: [
            new TextRun({
              text: "Mã số sinh viên: ",
            }),
            new TextRun({
              text: info.mssv,
              style: "cboldStyle",
            }),
          ],
        })
      );

      listOfParagraph.push(
        new Paragraph({
          style: "infoParagraphStyle",
          children: [
            new TextRun({
              text: "Số CMND/ CCCD: ",
            }),
            new TextRun({
              text: info.contactInfoId.CMND,
              style: "cboldStyle",
            }),
          ],
        })
      );

      listOfParagraph.push(
        new Paragraph({
          style: "infoParagraphStyle",
          children: [
            new TextRun({
              text: "Dân tộc: ",
            }),
            new TextRun({
              text: info.contactInfoId.nation,
              style: "cboldStyle",
            }),
            new TextRun({
              text: "\t\tTôn giáo: ",
            }),
            new TextRun({
              text: info.contactInfoId.religion,
              style: "cboldStyle",
            }),
          ],
        })
      );

      listOfParagraph.push(
        new Paragraph({
          style: "infoParagraphStyle",
          children: [
            new TextRun({
              text: "Email: ",
            }),
            new TextRun({
              text: info.email,
              style: "cboldStyle",
            }),
          ],
        })
      );

      listOfParagraph.push(
        new Paragraph({
          style: "infoParagraphStyle",
          children: [
            new TextRun({
              text: "Số điện thoại: ",
            }),
            new TextRun({
              text: info.contactInfoId.phone,
              style: "cboldStyle",
            }),
          ],
        })
      );

      listOfParagraph.push(
        new Paragraph({
          style: "infoParagraphStyle",
          children: [
            new TextRun({
              text: "Quê quán: ",
            }),
            new TextRun({
              text: info.contactInfoId.homeTown,
              style: "cboldStyle",
            }),
          ],
        })
      );

      listOfParagraph.push(
        new Paragraph({
          style: "infoParagraphStyle",
          children: [
            new TextRun({
              text: "Đơn vị: ",
            }),
            new TextRun({
              text: info.department.name,
              style: "cboldStyle",
            }),
          ],
        })
      );

      // Generate result of criteria

      const generateSoftTitle = function (
        listOfParagraph: any,
        condition: any,
        soft: any,
        indent: any
      ) {
        if (condition)
          listOfParagraph.push(
            new Paragraph({
              text: `${indent}Người nộp phải đạt tất cả các tiêu chí sau đây`,
              style: "italicStyle",
            })
          );
        else
          listOfParagraph.push(
            new Paragraph({
              text: `${indent}Người nộp phải đạt ít nhất ${soft} tiêu chí sau đây`,
              style: "italicStyle",
            })
          );
      };
      const findChild = function (array: any[], child: any) {
        return array.find((x: any) => x.idCriteria === child);
      };
      const generateCriteria = function (
        listOfParagraph: any,
        criteria: any,
        level: any,
        parentNumbering: any,
        numbering: any
      ) {
        const fullNumbering = `${
          level === 0 ? numbering : parentNumbering + "." + numbering
        }`;
        const indent = Array(level).fill("   ").join("");
        const title = `${indent}${fullNumbering}. ${criteria.nameCriteria}${
          criteria.content === criteria.nameCriteria
            ? ""
            : ": " + criteria.content
        }`;
        listOfParagraph.push(
          new Paragraph({
            text: title,
            style: "boldStyle",
          })
        );

        if (criteria.children.length > 0) {
          generateSoftTitle(
            listOfParagraph,
            criteria.children.length === criteria.soft,
            criteria.soft,
            indent
          );

          for (var [index, children] of criteria.children.entries()) {
            const childCritera = findChild(result.criterias, children);
            generateCriteria(
              listOfParagraph,
              childCritera,
              level + 1,
              fullNumbering,
              index + 1
            );
          }
        } else {
          if (criteria.method === "comment") {
            listOfParagraph.push(
              new Paragraph({
                text:
                  indent +
                  (criteria.studentComment.concat().length > 0
                    ? `${criteria.studentComment}`
                    : defaultText),
              })
            );
          } else if (criteria.method === "point") {
            listOfParagraph.push(
              new Paragraph({
                text:
                  indent +
                  (criteria.point !== 0
                    ? `Người nộp đã khai: ${criteria.point}`
                    : defaultText),
              })
            );
          } else if (criteria.method === "binary") {
            listOfParagraph.push(
              new Paragraph({
                text:
                  indent +
                  (criteria.binary ? `Người nộp đã khai: Đạt` : defaultText),
              })
            );
          }
        }
      };
      listOfParagraph.push(
        new Paragraph({
          text: "II. THÀNH TÍCH ĐÃ KHAI BÁO:",
          style: "boldStyle",
        })
      );
      generateSoftTitle(
        listOfParagraph,
        listOfRootCriteria.length === result.soft,
        result.soft,
        ""
      );

      for (var [index, criteria] of listOfRootCriteria.entries()) {
        generateCriteria(listOfParagraph, criteria, 0, 0, index + 1);
      }

      const doc = new Document({
        styles: {
          default: {
            document: {
              paragraph: {
                spacing: {
                  after: 3,
                  line: 280,
                },
                alignment: AlignmentType.JUSTIFIED,
              },
              run: {
                size: "14pt",
              },
            },
          },
          characterStyles: [
            {
              id: "citalicStyle",
              name: "italicStyle",
              run: {
                italics: true,
              },
            },
            {
              id: "cboldStyle",
              name: "boldStyle",
              run: {
                bold: true,
              },
            },
          ],
          paragraphStyles: [
            {
              id: "italicStyle",
              name: "italicStyle",
              run: {
                italics: true,
              },
            },
            {
              id: "boldStyle",
              name: "boldStyle",
              run: {
                bold: true,
              },
            },
            {
              id: "infoParagraphStyle",
              name: "infoParagraphStyle",
              paragraph: {
                indent: {
                  left: 720 * 5,
                },
              },
            },
            {
              id: "timeParagraphStyle",
              name: "timeParagraphStyle",
              paragraph: {
                alignment: AlignmentType.RIGHT,
                spacing: {
                  before: 12,
                  after: 12,
                },
              },
              run: {
                italics: true,
              },
            },
            {
              id: "titleStyle",
              name: "titleStyle",
              paragraph: {
                alignment: AlignmentType.CENTER,
                spacing: {
                  line: 280,
                  after: 0,
                },
              },
              run: {
                bold: true,
                size: "15pt",
              },
            },
          ],
        },
        sections: [
          {
            properties: {},
            children: listOfParagraph,
          },
        ],
      });
      Packer.toBlob(doc).then((blob) => {
        console.log(blob);
        fileSaver.saveAs(blob, `Bao_cao_thanh_tich_${info.mssv}.docx`);
        console.log("Document created successfully");
      });
    }
    async function getResultProfile(idUser: number) {
      const response = await AuditorApi.getSubmissionExamersToExport(
        achievementId,
        currentUser.id,
        [idUser]
      );
      const user = await UserApi.get(idUser);
      exportReport(response[0], user);
    }
    if (idProfile > -1) getResultProfile(idProfile);
  }, [idProfile, achievementId, currentUser.id, achievement]);

  const handleChangeSearch = (formValue: { text: string }) => {
    setFilters({
      ...filters,
      page: 1,
      search: formValue.text,
    });
  };

  const handleUpdateProfile = async (newProfile: any) => {
    setData(
      data.map((profile) =>
        profile.id === newProfile.id ? newProfile : profile
      )
    );
  };

  return (
    <>
      {[roles.DEPARTMENT].includes(currentUser.role) && (
        <CCard>
          <CCardHeader>
            <div className="d-flex align-items-center">
              <CTooltip content={`Quay lại`}>
                <CIcon
                  size="lg"
                  className="mr-2"
                  content={freeSet.cilArrowCircleLeft}
                  onClick={() => {
                    history.push(`/xem-ket-qua-tham-dinh`);
                  }}
                />
              </CTooltip>
              <strong>
                TÊN DANH HIỆU/GIẢI THƯỞNG:{" "}
                {achievement ? achievement.name?.toUpperCase() : ""}
              </strong>
            </div>
            <strong>Hồ sơ đã nộp: </strong> {statistic.no_all + ", "}
            <br />
            <strong>Hồ sơ đã thẩm định: </strong>{" "}
            {statistic.no_confirmed + ", "}
            <strong> trong đó: </strong>
            Loại A có {statistic.no_result_2 + " hồ sơ, "}
            Loại B có {statistic.no_result_1 + " hồ sơ, "}
            Loại C có {statistic.no_result_0 + " hồ sơ"}
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-2">
              <CCol sm="4" className="d-flex align-items-center">
                <CTooltip content={`Mssv, Tên, Email, Đơn vị`}>
                  <CIcon
                    className="mr-1"
                    size="lg"
                    content={freeSet.cilFilter}
                  />
                </CTooltip>
                <InputSearch onSubmit={handleChangeSearch} />
              </CCol>
              <CCol sm="2"></CCol>
              <CCol
                sm="6"
                className="d-flex justify-content-end align-items-center"
              >
                <div>Số lượng/ trang:</div>
                <CSelect
                  defaultValue={"10"}
                  style={{ width: "80px", float: "right", margin: "0 10px" }}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({ ...filters, limit: +e.currentTarget.value })
                  }
                >
                  <option value="5">5</option>
                  <option value="10" selected>
                    10
                  </option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </CSelect>

                {[roles.DEPARTMENT].includes(currentUser.role) && (
                  <CButton
                    color="info"
                    size=""
                    style={{ float: "right" }}
                    className=""
                  >
                    <CSVLink
                      data={dataCSV}
                      headers={headers}
                      filename={"danh-sach-nguoi-nop-ho-so.csv"}
                      style={{ color: "white" }}
                    >
                      Xuất dữ liệu
                    </CSVLink>
                  </CButton>
                )}
              </CCol>
            </CRow>

            <CDataTable
              items={data}
              fields={fields}
              noItemsView={{
                noResults: "Không có kết quả tìm kiếm",
                noItems: "Không có dữ liệu",
              }}
              scopedSlots={{
                stt: (item: any, index: number) => {
                  return (
                    <td className="align-middle text-center">{index + 1}</td>
                  );
                },
                mssv: (item: any) => {
                  return (
                    <td className="align-middle text-center">{item.mssv}</td>
                  );
                },
                name: (item: any) => {
                  return (
                    <td className="align-middle">
                      {item.surname + " " + item.name}
                    </td>
                  );
                },
                email: (item: any) => {
                  return <td className="align-middle">{item.email}</td>;
                },
                department: (item: any) => {
                  return <td className="align-middle">{item.department}</td>;
                },
                action: (item: any) => {
                  return (
                    <>
                      <td className="align-middle text-start">
                        {[roles.DEPARTMENT].includes(currentUser.role) && (
                          <>
                            <CTooltip content="Xuất báo cáo">
                              <CButton
                                size="sm"
                                color="info"
                                className="ml-1 mt-1"
                                onClick={() => {
                                  setIdProfile(item.id);
                                }}
                              >
                                <CIcon
                                  size="sm"
                                  content={freeSet.cilDataTransferDown}
                                />
                              </CButton>
                            </CTooltip>
                            {item.result !== "none" && (
                              <CTooltip content="Xem chi tiết hồ sơ">
                                <CButton
                                  size="sm"
                                  color="info"
                                  className="ml-1 mt-1"
                                  onClick={() =>
                                    history.push(
                                      `/ket-qua-tham-dinh/${achievementId}/${item.id}`
                                    )
                                  }
                                >
                                  <CIcon
                                    size="sm"
                                    content={freeSet.cilFolderOpen}
                                  />
                                </CButton>
                              </CTooltip>
                            )}
                          </>
                        )}
                      </td>
                    </>
                  );
                },
                result: (item: any) => {
                  return (
                    <td className="align-middle text-center">
                      {item.result === 2
                        ? "Đạt"
                        : item.result === 1
                        ? "Cần bổ sung hồ sơ"
                        : item.result === 0
                        ? "Không đạt"
                        : "Hồ sơ chưa duyệt"}
                    </td>
                  );
                },
              }}
            ></CDataTable>
            <div className={"mt-2 d-flex justify-content-center"}>
              <CPagination
                activePage={filters.page}
                className="align-middle text-center"
                pages={Math.ceil(count / filters.limit)}
                onActivePageChange={(i: number) =>
                  setFilters({ ...filters, page: i })
                }
              ></CPagination>
            </div>
          </CCardBody>
        </CCard>
      )}

      <FormUpdateProfile
        value={modal.value}
        onUpdateProfile={handleUpdateProfile}
        isOpen={modal.open}
        onClose={() =>
          setModal((data) => ({
            ...data,
            open: false,
          }))
        }
      />
    </>
  );
};

export default ReportedProfile;
